@AGENTS.md

# Imm — Mobile Relationship App

A minimalist couples app: one tap sends a "ping" (push notification + vibration) to your paired partner. Built with React Native (Expo SDK 57).

## Running the app

```bash
# .env is already filled in with Supabase credentials
```

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
  stores/                   # Zustand stores
    authStore.ts            # session, user, sessionLoaded
    profileStore.ts         # ownProfile, partnerProfile, pairedWith, pairId
    pingStore.ts            # pingStatus, offlineQueue, incomingPing
    networkStore.ts         # isConnected (null until first NetInfo event)
    unpairStore.ts          # (reserved — not active, see unpair notes below)
  hooks/
    useSupabaseSession.ts   # onAuthStateChange → authStore (call once from root)
    useProfile.ts           # TanStack Query: own profile + fetches pair UUID
    usePartnerProfile.ts    # TanStack Query: partner profile (by partner_id)
    usePingRealtime.ts      # Supabase Realtime subscription on moments table
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
    ui/                     # Button, TextInput, Avatar, LoadingSpinner, Toast
    ping/                   # PingButton, PingRipple, PingParticles, IncomingPingOverlay
    pair/                   # InviteCodeDisplay, InviteCodeInput
    unpair/                 # UnpairInitiator, UnpairPendingBanner (banner is stub)
  types/
    database.ts             # Supabase table types (hand-written — see gotcha below)
    ping.ts                 # QueuedPing, IncomingPing, PingStatus
  constants/
    colors.ts               # Design tokens (mirror of tailwind.config.js)
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

Two rules the tokens do not enforce:
- **Warm is you, cool is her.** Colour is the carrier of who-sent-what everywhere.
- **`font-display` (Newsreader italic) is for names and headlines only** — never labels,
  values, buttons or numbers.

## 3-state auth guard

`app/_layout.tsx` moves the user between `(auth)`/`(onboarding)`/`(pair)`/`(home)` groups from a
`useEffect` (not `<Redirect>`) — see the comment above `RootNavigator` for why. `pairedWith` is set
from `profile.partner_id` (the partner's user_id); it is non-null only when the user has an active pair.

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

**`pairs`**
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| requester_id | uuid | user who generated invite |
| receiver_id | uuid | nullable — filled on redeem |
| invite_code | text | nullable unique — cleared on activation |
| expires_at | timestamptz | pending invites expire 15 min after creation |
| status | text | 'pending' / 'active' / 'dissolved' |
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
- `avatars` — profile photos at `<user_id>/avatar.jpg` (`profiles.avatar_url`
  holds a path despite the column name; `Avatar` signs it)

### Edge Functions (deployed)
| Function | What it does |
|---|---|
| `generate-invite-code` | Deletes old pending pair, creates new one, returns 6-char code |
| `redeem-invite-code` | Finds pair by code, sets receiver_id + status=active, sets partner_id on both profiles |
| `send-ping` | Finds caller's active pair, inserts into moments table |
| `dissolve-pair` | Sets pair status=dissolved, clears partner_id on both profiles |

All Edge Functions use `service_role` key and bypass RLS.

### RLS policies
RLS is enabled on all tables. Policies:
- `profiles`: own user can read/write own row; can read partner's row (via partner_id lookup)
- `pairs`: members (requester_id or receiver_id) can read their own pair
- `moments`: members of the active pair can read moments for that pair
- Writes to `moments` and `pairs` go through Edge Functions only

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
