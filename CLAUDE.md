@AGENTS.md

# Imm — Mobile Relationship App

A minimalist couples app: one tap sends a "ping" (push notification + vibration) to your paired partner. Built with React Native (Expo SDK 57).

## Running the app

```bash
# .env is already filled in with Supabase credentials
```

### Test accounts

Phone OTP needs an SMS provider that is not configured yet, so in a dev build typing **`01`** or
**`02`** on the phone screen signs in as one of two seeded accounts
(`supabase/migrations/20260916160000_dev_test_users.sql`, mapped in `src/lib/devUsers.ts`).
They are real `auth.users` rows signing in with email + password, so RLS, the Edge Functions,
Realtime and pairing all behave exactly as they do for a real account — run one on each
device/simulator to drive both sides of the pairing flow. Everything is gated on `__DEV__`.

One account is one phone (see "Single active device"), so signing in as `01` on a second
device signs the first one out — use `01` on one device and `02` on the other.

No profile rows are seeded, so each login walks onboarding → pairing. The migration's header
comment has the SQL to wipe both accounts' profiles/pairs/moments and start over.

## Tech stack

See `package.json` for the current dependency and version list.

## Project structure

```
app/                        # expo-router screens (file-based routing)
  _layout.tsx               # ROOT: providers + 3-state auth guard
  (auth)/                   # unauthenticated: phone.tsx, verify.tsx
  (onboarding)/             # authenticated, no profile: profile-setup.tsx
  (pair)/                   # has profile, no partner: create-invite.tsx, enter-invite.tsx
  (home)/                   # fully paired: index.tsx (send), thread.tsx, settings.tsx

src/
  lib/
    supabase.ts             # Supabase client (SecureStore session adapter)
    queryClient.ts          # TanStack Query client
    notifications.ts        # expo-notifications shim (null in Expo Go on Android)
    pingQueue.ts            # SINGLE OWNER of the send path — see note below
    uploadImage.ts          # the only correct way to put a local photo in a bucket
    avatar.ts               # pick / change profile photo — fresh path, cache + store sync
    activeDevice.ts         # one account, one phone: claim on sign-in, detect replacement
    signOut.ts              # the single sign-out path — never navigates, see gotcha
    devUsers.ts             # __DEV__ shortcut: "01"/"02" → the seeded test accounts
  stores/                   # Zustand stores
    authStore.ts            # session, user, sessionLoaded
    profileStore.ts         # ownProfile, partnerProfile, pairedWith, pairId
    pingStore.ts            # pingStatus, offlineQueue, incomingPing
    networkStore.ts         # isConnected (null until first NetInfo event)
    appStore.ts             # isRevealed (startup cover is down); sessionReplaced (say why)
    unpairStore.ts          # (reserved — not active, see unpair notes below)
  hooks/
    useSupabaseSession.ts   # onAuthStateChange → authStore (call once from root)
    useActiveDevice.ts      # signs this phone out when the account signs in elsewhere (root)
    useProfile.ts           # TanStack Query: own profile + fetches pair UUID
    usePartnerProfile.ts    # TanStack Query: partner profile (by partner_id)
    usePingRealtime.ts      # Supabase Realtime subscription on moments table
    usePairRealtime.ts      # Supabase Realtime on the pairs row — the other side unpairing
    useSendPing.ts          # thin wrapper over lib/pingQueue.sendPing
    useNetworkStatus.ts     # reads networkStore — owns no subscription
    usePingFeedback.ts      # queue events → toast/haptics + ping status reset
    usePushRegistration.ts  # Expo push token → profiles.push_token; tap handling
    useSignedMomentUrl.ts   # signs a private storage path for display
    usePingAnimation.ts     # Reanimated hold-to-charge gesture + shared values
    useHaptics.ts           # Haptic pattern wrappers
    useIncomingPing.ts      # Overlay trigger + local notification when backgrounded
    useInviteCode.ts        # generate-invite-code + redeem-invite-code Edge Functions
    useUnpairFlow.ts        # dissolve-pair Edge Function (simplified single-step)
  components/
    ui/                     # Button, TextInput, Avatar, LoadingSpinner, Toast,
                            #   BackButton (in-group back, with a fallback),
                            #   SignOutLink (the only way out of a guarded group),
                            #   MomentPhoto (ping photo: fixed slot, fades in on decode)
    ping/                   # PingButton, PingRipple, PingParticles, IncomingPingOverlay
    pair/                   # InviteCodeDisplay, InviteCodeInput
    unpair/                 # UnpairInitiator, UnpairPendingBanner (banner is stub)
  types/
    database.ts             # Supabase table types (hand-written — see gotcha below)
    ping.ts                 # QueuedPing, IncomingPing, PingStatus
  constants/
    colors.ts               # Design tokens (mirror of tailwind.config.js)
    shadows.ts              # boxShadow tokens — the only source of depth
    transitions.ts          # screen transitions — stateChange / panel / step
    vessel.ts               # Tuned constants for the send interaction
    timing.ts               # Animation constants (CHARGE_DURATION_MS, spring configs)
    hapticPatterns.ts       # Haptic style mappings

supabase/
  migrations/               # schema history — apply with `supabase db push`
  functions/
    generate-invite-code/   # Creates pending pair + 6-char invite code (15 min TTL)
    redeem-invite-code/     # Atomically claims the invite, sets partner_id on both
    send-ping/              # Inserts into moments + sends the Expo push
    dissolve-pair/          # Sets pair status=dissolved, clears partner_id
```

## Design system

All custom tokens are in `tailwind.config.js` under `theme.extend.colors.imm` and `fontFamily`,
mirrored in `src/constants/colors.ts` for Reanimated/SVG/StyleSheet contexts. Keep the two in sync.

Three rules the tokens do not enforce:
- **Warm is you, cool is your partner.** Colour is the carrier of who-sent-what everywhere.
  All user-facing copy is gender-neutral — "your partner", "they/them"; the app never asks.
- **`font-display` (Newsreader italic) is for names and headlines only** — never labels,
  values, buttons or numbers.
- **Depth comes from `boxShadow` in `src/constants/shadows.ts`, never Android `elevation`**
  or the `shadowColor`/`shadowOpacity`/`shadowRadius` triple — see the gotcha below.

## 3-state auth guard

`app/_layout.tsx` moves the user between `(auth)`/`(onboarding)`/`(pair)`/`(home)` groups from a
`useEffect` (not `<Redirect>`) — see the comment above `RootNavigator` for why. `pairedWith` is set
from `profile.partner_id` (the partner's user_id); it is non-null only when the user has an active pair.

**`ready` is not the same as "showing the right screen".** `ready` only means the answer is known;
the navigator is still on the route the app booted into (expo-router resolves `/` to `(home)/index`
before anything is decided) until `replace()` lands a render later. So the splash and the cover are
gated on `settled` — `ready` *and* the router already on the resolved group. Hiding on `ready`
uncovers the navigator one render early, which is the startup flash. The root navigator stays
mounted throughout and is covered rather than withheld, because expo-router throws if the root
layout's first render has no navigator.

**Transitions live in `src/constants/transitions.ts`** — `stateChange` (cross-fade between groups),
`panel` (Moments/Settings rise over Home, which never moves), `step` (parallax for linear flows).
The root is a `Stack`, not a `<Slot />`, only so group changes can fade; a Slot hard-cuts. Its
fade is switched on a frame *after* the reveal: the startup replace commits in the same render
that lifts the cover, and animating it would replay the startup flash as a cross-fade. `STARTUP_SETTLE_TIMEOUT_MS` reveals the app anyway if settling never
happens — a flash is recoverable, a splash that never lifts is not.

**The cover hides the screen, not the device.** A screen the guard is about to replace still
mounts, runs its effects and can take focus, and a keyboard is a system window that draws
*over* the cover — so `autoFocus` at launch produced a keyboard with no visible screen behind
it. Nothing may take focus before `appStore.isRevealed`: `(auth)/phone` and
`(onboarding)/profile-setup` focus from an effect keyed on it rather than using `autoFocus`,
which fires on mount and cannot be deferred. Any new autofocusing field needs the same.

## Supabase schema

### Tables

**`profiles`**
| Column | Type | Notes |
|---|---|---|
| id | uuid | = auth.uid (PK) |
| username | text | displayed to partner |
| avatar_url | text | nullable |
| partner_id | uuid | nullable — partner's user_id |
| push_token | text | nullable — Expo push token |
| quiet_hours_start | smallint | nullable — minutes since local midnight; null = off |
| quiet_hours_end | smallint | nullable |
| created_at | timestamptz | |

Quiet hours has **no UI**: the switch only ever gated the local notification, so a push that
arrived while the app was closed came through anyway. The columns stay for when `send-ping`
gates on them server-side. "Keep photo moments" is in the handoff and was never built.

**`pairs`**
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| requester_id | uuid | user who generated invite |
| receiver_id | uuid | nullable — filled on redeem |
| invite_code | text | nullable unique — cleared on activation |
| expires_at | timestamptz | pending invites expire 15 min after creation |
| status | text | 'pending' / 'active' / 'rejected' / 'dissolved' |
| created_at | timestamptz | |

**`moments`** (the ping events)
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| pair_id | uuid | FK → pairs |
| sender_id | uuid | FK → auth.users |
| photo_path | text | nullable — Storage **path**, not a URL (sign at read time) |
| client_id | text | nullable — client localId; unique per sender (idempotency) |
| viewed_at | timestamptz | nullable — never written yet (read receipts unimplemented) |
| created_at | timestamptz | |

### Storage buckets
Both are **private**, both key their policies off the first path segment being the
owner's user id, and both are read at display time through `useSignedUrl` — the
database stores a **path**, never a URL, and a signed URL is never persisted.

- `moments` — ping photos at `<sender_user_id>/<local_id>.jpg`
- `avatars` — profile photos at `<user_id>/avatar-<timestamp>.jpg` (`profiles.avatar_url`
  holds a path despite the column name; `Avatar` signs it). **Every new photo gets a new
  path — never overwrite in place.** The signed-URL query, the image cache and the partner's
  copy of the row are all keyed on the path, and objects are served with
  `max-age=3600`, so an overwrite keeps showing the old face. `src/lib/avatar.ts`
  (`changeAvatar`) uploads, updates the row, writes the result to both the `['profile']`
  query cache and `profileStore`, then deletes the previous object (`20260917090000`
  added the delete policy). Older rows may still hold the legacy `avatar.jpg` path.
  The partner's phone learns about it in `usePartnerProfile`, which refetches whenever the
  app returns to the foreground — `profiles` is deliberately not in Realtime (it would
  broadcast `push_token`), so a change made while both apps are open shows on the next resume.

### Edge Functions (deployed)
| Function | What it does |
|---|---|
| `generate-invite-code` | Deletes old pending pair, creates new one, returns 6-char code |
| `redeem-invite-code` | Finds pair by code, sets receiver_id + status=active, sets partner_id on both profiles |
| `send-ping` | Finds caller's active pair, inserts into moments table |
| `dissolve-pair` | Sets pair status=dissolved, clears partner_id on both profiles |

All Edge Functions use `service_role` key and bypass RLS.

### RLS policies
RLS is enabled on all tables. **RLS is not a grant**: `authenticated` needs
`select/insert/update` on `profiles` and `select` on `pairs`/`moments`, and `service_role`
needs full DML — BYPASSRLS skips policies, not GRANTs. Both were missing until
`20260916160300`, which made every query fail before its policy was consulted.

Policies:
- `profiles`: own user can read/write own row; can read the row that names them as its
  partner (`partner_id = auth.uid()`). **Never write a `profiles` policy that selects from
  `profiles`** — that is 42P17, infinite recursion, and it takes the whole app down.
- `pairs`: members (requester_id or receiver_id) can read their own pair
- `moments`: members of the active pair can read moments for that pair
- Writes to `moments` and `pairs` go through Edge Functions only — there are no client write
  policies or grants on either (`20260917140000` removed the dashboard-era Turkish policies)
- **`profiles` writes are column-granted**: `insert (id, username, avatar_url)`,
  `update (id, username, avatar_url, push_token)`. A client could previously rewrite its own
  `partner_id`, and the storage read policies trust that column — so it could read anyone's
  photos. Never grant table-wide INSERT/UPDATE on `profiles`; a new client-editable column
  needs its own column grant.
- Every table also carries the restrictive `"live session only"` policy (see Single active device)

## profileStore fields
- `ownProfile` — own Profile row
- `partnerProfile` — partner's Profile row
- `pairedWith` — partner's user_id (= `ownProfile.partner_id`), used by auth guard
- `pairId` — UUID from the pairs table, fetched by `useProfile` after load, used by Realtime channel

## Hold-to-ping animation

`usePingAnimation` uses `Gesture.Pan()` (gesture-handler v2) on the UI thread:
- `onBegin`: `chargeProgress` animates 0→1 over 1200ms via `withTiming`
- `onEnd`: reads elapsed time, if ≥85% charge → burst + `runOnJS(sendPing)`, else → `withSpring(0)` snap-back
- `useAnimatedReaction` watches `chargeProgress` in thirds → progressive haptics via `runOnJS(chargeHaptic)`
- `PingRipple`: 3 SVG `AnimatedCircle`s driven by `useAnimatedProps` (strokeDashoffset)
- `PingParticles`: 12 dots burst radially via `withSpring` on `burstTrigger` increment

To regenerate types from the live schema:
```bash
npx supabase gen types typescript --project-id tzhkrhxnfjephtrxbmvp > src/types/database.ts
```

## Single active device

An account is signed in on one phone at a time (`20260917120000_single_active_device.sql`,
`src/lib/activeDevice.ts`, `src/hooks/useActiveDevice.ts`).

- **Claim.** Right after a successful sign-in (`verify.tsx`, `devUsers.ts`) the app calls the
  `claim_active_device()` RPC. It records the session in `active_devices`, deletes every other
  row in `auth.sessions` for the user (refresh tokens cascade) and clears `push_token`. A
  session restored from storage must never claim; the RPC also refuses a session that is
  already revoked, so an old phone cannot take the account back. If the claim fails the new
  sign-in is dropped rather than leaving two phones on one account.
- **Enforce.** Deleting the session is enough for Auth and the Edge Functions (`getUser` →
  `session_not_found`), but **PostgREST, Storage and Realtime only check a JWT's signature and
  expiry** — measured: a revoked token kept full read/write for its remaining lifetime (≤1h).
  A restrictive `"live session only"` policy on `profiles`, `pairs`, `moments` and
  `storage.objects` requires `session_is_live()`. Any new table needs the same policy.
- **Detect.** The old phone learns through Realtime on `active_devices` (~1s while open) and
  through `getUser()` on launch and on every foreground. `active_devices` has *no* live-session
  check on purpose: the phone that needs the event is the one whose session was just deleted.
- **RLS filters, it does not error.** A replaced session reads *no rows*, so `useProfile` only
  believes "no profile" after confirming the session is alive — otherwise a replaced phone would
  be routed to onboarding. Network errors never count as revoked: being offline must not sign
  anyone out.

## Unpair flow

Currently simplified: one-tap dissolve via `dissolve-pair` Edge Function. No mutual consent.
`UnpairPendingBanner` is a stub (returns null). To add mutual consent later, create an
`unpair_requests` table and restore the `initiate/confirm/decline` pattern in `useUnpairFlow`.

## The send interaction

`src/hooks/usePingAnimation.ts` drives the vessel from **one `useFrameCallback` loop**, not
per-phase `withTiming`. The settle curve after release is a non-monotonic ad-hoc formula no
standard easing expresses, and the ready-squash and meniscus wobble need a free-running clock
that every layer samples at the same instant. Every number lives in `src/constants/vessel.ts`
and came from the design prototype — they were tuned, not derived, so don't "simplify" them.

Two things that look wrong but are deliberate: the threshold is compared against **linear**
hold progress (not the eased value, which would desync the haptics from the visuals), and
`performance.now()` is called **inside** the worklet (mixing it with `Date.now()` in the
gesture would mix epochs).

## Ping send path

`src/lib/pingQueue.ts` is the **only** place a ping is uploaded or sent, and it is a
module singleton, not a hook. Drains fire from NetInfo/AppState callbacks when no
component is mounted, and the root layout swaps route groups on sign-out, so a
component-scoped owner would be torn down mid-drain. `initPingQueue()` is called once
from `RootNavigator`. Hooks (`useSendPing`, `useNetworkStatus`) are thin readers —
**do not give them subscriptions or call the queue from more than one place**, which
is what previously produced duplicate listeners and double-sent pings.

Only `sendPing` writes `pingStatus`. Drains report through `subscribeToPingQueue`
events, which `usePingFeedback` turns into toasts/haptics — this is what keeps a
background drain from overwriting an in-flight send's status.

`usePingFeedback` also invalidates the `moments` query on `sent` and `drained`. An online
send never touches the offline queue, so nothing else told the thread it had happened: the
query is stale-for-30s and was only ever invalidated by a ping *arriving*, which meant your
own pings showed up only once your partner sent one. Any new path that delivers a ping has
to emit one of those events or the thread will silently go stale again.

## Critical gotchas

- **Push notifications require a development build.** Expo Go has not supported remote
  push since SDK 53, so in Expo Go `usePushRegistration` deliberately no-ops and
  `profiles.push_token` stays null — pings then only arrive while the partner has the
  app open. This is expected, not a bug. To test push: `eas build --profile development`,
  plus FCM V1 credentials (Android) and an APNs key (iOS).
- **Push delivery is best-effort and must never fail the ping.** The moment row is the
  source of truth; Realtime still delivers in-app if the push fails. A ticket returning
  `DeviceNotRegistered` clears that `push_token`.
- **`moments.client_id` is an idempotency key.** A retry of a send whose response was
  lost must collapse onto the original row — `send-ping` treats a 23505 as success.
- **Invite redemption must stay a single conditional UPDATE.** Splitting it back into
  select-then-update reopens the race where two people redeem the same code.

- **Realtime needs the table in the publication.** `moments` was not in `supabase_realtime`,
  so `usePingRealtime` subscribed, reported SUBSCRIBED and received nothing — the in-app
  ping path was dead end to end. `20260916160200` adds it plus `replica identity full`, and
  `20260916170000` does the same for `pairs`. Measured delivery is ~100-300ms once the Edge
  Function is warm; a cold `send-ping` adds several seconds on the first call.
- **Both sides of an unpair have to be told.** `dissolve-pair` runs entirely server-side, so
  the device that did not initiate it learned nothing — its profile query is 5 minutes stale
  and only polls while *unpaired*. `usePairRealtime` watches the `pairs` row and clears the
  stores locally; the guard does the rest. It bails when `pairedWith` is already null, which
  is what stops the initiator toasting at itself over its own event.
- **A dissolved pair must not block re-pairing.** `pairs` had a plain
  UNIQUE (requester_id, receiver_id); after unpairing, redeeming a fresh code from the same
  person violated it and surfaced as "Could not complete pairing". It is now a partial unique
  index over `status <> 'dissolved'` (`20260916160400`).
- **`profiles.username` is not unique** (`20260916160500`). It is a per-couple display name;
  a global UNIQUE meant the second "Alex" in the database could not finish onboarding.
- **Never hand supabase-js the React Native `{ uri, type, name }` upload shape.** It only
  builds a multipart body for a `Blob` or a `FormData`; anything else goes to fetch as-is,
  and that object was serialised to JSON — the bucket stored ~250 bytes of
  `text/plain;charset=UTF-8` describing the file, the upload returned 200 with a valid
  `data.path`, the row looked right and every `<Image>` silently failed to decode. Upload
  through `src/lib/uploadImage.ts`, which reads `new File(uri).bytes()` and passes an
  explicit `contentType` (the supabase-js default is text/plain). `expo-file-system`'s
  `File` implements Blob structurally but is not `instanceof Blob`, so it takes the same
  wrong branch — read the bytes.
- **Nothing pushes pair activation to the person who generated the code.** Their own
  `profiles` row is changed server-side by `redeem-invite-code`, and `profiles` is not in the
  Realtime publication. `useProfile` polls every 3s while `ownProfile` exists with no
  `partner_id`, and stops the moment it lands. That poll used to live in `WaitingForPartner`,
  which only mounts after Copy or Share is tapped — read the code out loud and that device
  never redirected. Keep it on the query, not in a component.
- **`getSession()` and `onAuthStateChange` both answer the initial question.** They used to race,
  and whichever landed first set `sessionLoaded` — so an `INITIAL_SESSION` of null arriving before
  the SecureStore read had finished declared the startup resolved-and-signed-out, sent an already
  signed-in user to `(auth)`, and ran the whole sign-out teardown (queue purge, query-cache clear)
  on a cold start. `useSupabaseSession` now subscribes only *after* `getSession()` settles, so
  there is exactly one source for the initial answer and the listener only reports later changes.
- **A pushed screen still needs a `fallback`.** `BackButton` uses `router.back()` when
  there is history and `replace`s a route in the *same* group when there is not — a screen
  the guard reached by `replace` has an empty stack, where `back()` is a button that does
  nothing. Crossing groups is never a back button's job; see the next gotcha.
- **Never navigate across auth groups by hand.** The guard owns which group you are in, so
  a `router.push('/(auth)/phone')` from `(pair)` is replaced on the very next render — the
  session and profile still say PAIR. That is why the invite screen offers *sign out* rather
  than *back*: dropping the session is the only thing that changes the guard's answer.
  `src/lib/signOut.ts` deliberately does not navigate, and falls back to a local sign-out so
  a failed network call cannot strand someone on a screen with no way out.
- **A photo's space is reserved from the path, never from the URL.** The overlay rendered its
  photo card only once the signed URL existed, so the card popped in ~1s after the name and
  shoved the centred column up. Render ping photos through `MomentPhoto`, which lays out at
  full size as soon as the path is known and fades the image in on `onLoad`.
- **Never use Android `elevation`.** Every translucent white surface on the ping screen
  carried `elevation` alongside the iOS `shadow*` props, and Android painted the outline
  shadow as a hard, faceted copy of the shape *inside* the control — the white octagon in
  the header circles, the camera button and the vessel. All of it now goes through
  `boxShadow` (RN 0.76+, same on both platforms), tokenised in `src/constants/shadows.ts`
  straight from the handoff's CSS values. Don't reintroduce either older mechanism.
- **Android clips the last glyph of a button label** when the text node is measured with the
  fallback face before the custom font swaps in — this is why "Continue" rendered as
  "Continu". `Button` sets `flexShrink: 0` + `includeFontPadding: false` on its label; any
  new text inside a fixed-height pill needs the same.
- **`react-native-worklets/plugin` must be the last plugin in `babel.config.js`** — moving it breaks the Reanimated worklet system silently. Reanimated 4 moved the Babel plugin into `react-native-worklets` (a required peer dep); the old `react-native-reanimated/plugin` path only works as a shim and fails bundling if `react-native-worklets` is not installed.
- **`expo-file-system` (v19+, SDK 54+) has a new API.** The old `FileSystem.documentDirectory` / `copyAsync` / `makeDirectoryAsync` are removed from the main entry. Use `expo-file-system/legacy` imports where the legacy path-string API is needed (`src/lib/pingQueue.ts`). The `./legacy` export still exists in SDK 57.
- **NativeWind v4 requires Tailwind CSS v3**, not v4. The project pins `tailwindcss@^3.4.x` in `devDependencies`.
- **Supabase session must use `expo-secure-store`** as the storage adapter (not AsyncStorage) — see `src/lib/supabase.ts`. `detectSessionInUrl: false` is required for React Native.
- **`GestureHandlerRootView` must wrap the entire tree** — it's at the top of `app/_layout.tsx`. Without it, gesture-handler gestures fail silently on Android.
- **`Gesture.Pan().minDistance(0)`** is used for the hold-to-ping interaction (not `LongPress`) because it fires `onBegin` immediately on touch and `onEnd` on release, giving us precise hold-duration tracking via `Date.now()`.
- **Offline ping queue photos**: photo URIs from `expo-image-picker` point to OS temp dirs that may be cleared. `useSendPing` copies photos to `FileSystem.documentDirectory + 'ping-moments/'` before queuing.
- **`expo-splash-screen`**: `SplashScreen.preventAutoHideAsync()` is called at module level in `app/_layout.tsx`. It's hidden only after both `sessionLoaded` and `fontsLoaded` are true.
- **Expo Go on a phone requires the SDK Expo Go currently ships** (App Store/Play Store Expo Go only supports the latest SDK; older iOS Expo Go cannot be installed). Upgrade with `npx expo install expo@^<sdk>.0.0 --fix`, then `npx expo-doctor@latest`.
- **SDK 55+ removed `newArchEnabled` and `android.edgeToEdgeEnabled` from `app.json`** (New Architecture and edge-to-edge are mandatory). SDK 57 also removed the top-level `splash` key — splash is configured through the `expo-splash-screen` config plugin entry in `plugins`.
- **TypeScript 6 (SDK 57 default)**: `baseUrl` is deprecated (paths resolve relative to `tsconfig.json`), and side-effect imports must resolve to a typed module — `global.d.ts` declares `*.css` for the `import '../global.css'` NativeWind entry.
- **Supabase phone OTP** needs an SMS provider (e.g. Twilio) configured in the Supabase dashboard; without it `signInWithOtp` fails at runtime even though the app boots.
- **Env vars**: use `EXPO_PUBLIC_` prefix — Expo only exposes env vars with this prefix to the client bundle.
- **Row types in `src/types/database.ts` must stay `type` aliases, not `interface`.**
  supabase-js constrains each table's `Row` to `Record<string, unknown>`, and interfaces
  have no implicit index signature — declaring them as interfaces silently widens every
  Insert/Update payload to `never` and forces `as any` casts at every write site. The
  file is still hand-written; regenerate with `supabase gen types` when convenient.
- **`pairId` vs `partner_id`**: `profileStore.pairedWith` is the partner's user_id; `profileStore.pairId` is the pairs table UUID. Realtime uses `pairId`; auth guard uses `pairedWith`.
