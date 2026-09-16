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
  (home)/                   # fully paired: index.tsx (ping screen), settings.tsx

src/
  lib/
    supabase.ts             # Supabase client (SecureStore session adapter)
    queryClient.ts          # TanStack Query client
  stores/                   # Zustand stores
    authStore.ts            # session, user, sessionLoaded
    profileStore.ts         # ownProfile, partnerProfile, pairedWith, pairId
    pingStore.ts            # pingStatus, offlineQueue, incomingPing
    unpairStore.ts          # (reserved — not active, see unpair notes below)
  hooks/
    useSupabaseSession.ts   # onAuthStateChange → authStore (call once from root)
    useProfile.ts           # TanStack Query: own profile + fetches pair UUID
    usePartnerProfile.ts    # TanStack Query: partner profile (by partner_id)
    usePingRealtime.ts      # Supabase Realtime subscription on moments table
    useSendPing.ts          # send ping, handles online/offline
    useOfflineQueue.ts      # AsyncStorage queue persistence + drain on reconnect
    useNetworkStatus.ts     # NetInfo listener, calls onReconnect callback
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
    database.ts             # Supabase table types (hand-stub — replace with generated)
    ping.ts                 # QueuedPing, IncomingPing, PingStatus
  constants/
    colors.ts               # Design tokens (mirror of tailwind.config.js)
    timing.ts               # Animation constants (CHARGE_DURATION_MS, spring configs)
    hapticPatterns.ts       # Haptic style mappings

supabase/
  functions/
    generate-invite-code/   # Creates pending pair + 6-char invite code
    redeem-invite-code/     # Activates pair, sets partner_id on both profiles
    send-ping/              # Inserts into moments table
    dissolve-pair/          # Sets pair status=dissolved, clears partner_id
```

## Design system

All custom tokens are in `tailwind.config.js` under `theme.extend.colors.imm` and `fontFamily`.

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
| created_at | timestamptz | |

**`pairs`**
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| requester_id | uuid | user who generated invite |
| receiver_id | uuid | nullable — filled on redeem |
| invite_code | text | nullable unique — cleared on activation |
| status | text | 'pending' / 'active' / 'dissolved' |
| created_at | timestamptz | |

**`moments`** (the ping events)
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| pair_id | uuid | FK → pairs |
| sender_id | uuid | FK → auth.users |
| photo_url | text | nullable — Supabase Storage URL |
| viewed_at | timestamptz | nullable |
| created_at | timestamptz | |

### Storage bucket
- `moments` — public bucket for ping photo uploads

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

## Critical gotchas

- **`react-native-worklets/plugin` must be the last plugin in `babel.config.js`** — moving it breaks the Reanimated worklet system silently. Reanimated 4 moved the Babel plugin into `react-native-worklets` (a required peer dep); the old `react-native-reanimated/plugin` path only works as a shim and fails bundling if `react-native-worklets` is not installed.
- **`expo-file-system` (v19+, SDK 54+) has a new API.** The old `FileSystem.documentDirectory` / `copyAsync` / `makeDirectoryAsync` are removed from the main entry. Use `expo-file-system/legacy` imports in hooks that need the legacy path-string API (`useSendPing`, `useOfflineQueue`). The `./legacy` export still exists in SDK 57.
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
- **`pairId` vs `partner_id`**: `profileStore.pairedWith` is the partner's user_id; `profileStore.pairId` is the pairs table UUID. Realtime uses `pairId`; auth guard uses `pairedWith`.
