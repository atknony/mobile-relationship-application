@AGENTS.md

# Imm — Mobile Relationship App

A minimalist couples app: one tap sends a "ping" (push notification + vibration) to your paired partner. Built with React Native (Expo SDK 54).

## Running the app

```bash
# Start dev server
npx expo start

# Copy .env.example → .env and fill in your Supabase credentials first
cp .env.example .env
```

## Tech stack

| Concern | Library | Version |
|---|---|---|
| Framework | Expo | SDK 54 |
| Routing | expo-router | v6 (file-based) |
| Global state | Zustand | v5 |
| Server/async state | TanStack Query | v5 |
| Styling | NativeWind + Tailwind CSS | v4 + v3 |
| Animation | react-native-reanimated | v4 |
| Gestures | react-native-gesture-handler | v2 |
| Haptics | expo-haptics | — |
| Backend | @supabase/supabase-js | v2 |
| Auth storage | expo-secure-store | — |
| Offline queue | @react-native-async-storage/async-storage | — |
| Network detect | @react-native-community/netinfo | — |
| Photos | expo-image-picker + expo-file-system/legacy | — |
| Font | @expo-google-fonts/nunito | — |

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
    profileStore.ts         # ownProfile, partnerProfile, pairedWith
    pingStore.ts            # pingStatus, offlineQueue, incomingPing
    unpairStore.ts          # mutual-consent unpair state machine
  hooks/
    useSupabaseSession.ts   # onAuthStateChange → authStore (call once from root)
    useProfile.ts           # TanStack Query: own profile
    usePartnerProfile.ts    # TanStack Query: partner profile
    usePingRealtime.ts      # Supabase Realtime subscription (pings + unpair_requests)
    useSendPing.ts          # send ping, handles online/offline
    useOfflineQueue.ts      # AsyncStorage queue persistence + drain on reconnect
    useNetworkStatus.ts     # NetInfo listener, calls onReconnect callback
    usePingAnimation.ts     # Reanimated hold-to-charge gesture + shared values
    useHaptics.ts           # Haptic pattern wrappers
    useIncomingPing.ts      # Overlay trigger + local notification when backgrounded
    useInviteCode.ts        # generate-invite-code + redeem-invite-code Edge Functions
    useUnpairFlow.ts        # initiate / confirm / decline unpair via Edge Functions
  components/
    ui/                     # Button, TextInput, Avatar, LoadingSpinner, Toast
    ping/                   # PingButton, PingRipple, PingParticles, IncomingPingOverlay
    pair/                   # InviteCodeDisplay, InviteCodeInput
    unpair/                 # UnpairInitiator, UnpairPendingBanner
  types/
    database.ts             # Supabase table types (hand-stub — replace with generated)
    ping.ts                 # QueuedPing, IncomingPing, PingStatus
  constants/
    colors.ts               # Design tokens (mirror of tailwind.config.js)
    timing.ts               # Animation constants (CHARGE_DURATION_MS, spring configs)
    hapticPatterns.ts       # Haptic style mappings
```

## Design system

```
Background:  #F0EDFF  (soft lavender)   → bg-imm-bg
Accent blue: #74B9FF  (sky blue)        → bg-imm-blue / text-imm-blue
Accent coral:#FF6B6B  (coral/send)      → bg-imm-coral / text-imm-coral
Text:        #2D1B69  (deep purple)     → text-imm-text
Text muted:  #7B6BA8                    → text-imm-muted
Font:        Nunito (loaded via expo-google-fonts)
             font-nunito / font-nunito-semibold / font-nunito-bold / font-nunito-extrabold
```

All custom tokens are in `tailwind.config.js` under `theme.extend.colors.imm` and `fontFamily`.

## 3-state auth guard

`app/_layout.tsx` reads Zustand synchronously and issues `<Redirect>`:

```
sessionLoaded=false   → splash screen stays up (SplashScreen.preventAutoHideAsync)
!session              → /(auth)/phone
session && !profile   → /(onboarding)/profile-setup
profile && !pairedWith→ /(pair)/create-invite
profile && pairedWith → <Slot /> → (home)/index
```

## Hold-to-ping animation

`usePingAnimation` uses `Gesture.Pan()` (gesture-handler v2) on the UI thread:
- `onBegin`: `chargeProgress` animates 0→1 over 1200ms via `withTiming`
- `onEnd`: reads elapsed time, if ≥85% charge → burst + `runOnJS(sendPing)`, else → `withSpring(0)` snap-back
- `useAnimatedReaction` watches `chargeProgress` in thirds → progressive haptics via `runOnJS(chargeHaptic)`
- `PingRipple`: 3 SVG `AnimatedCircle`s driven by `useAnimatedProps` (strokeDashoffset)
- `PingParticles`: 12 dots burst radially via `withSpring` on `burstTrigger` increment

## Supabase integration points

The Supabase backend is being built separately. These are the frontend ↔ backend contracts:

| Frontend call | Backend surface |
|---|---|
| `supabase.auth.signInWithOtp({ phone })` | Supabase Auth (phone OTP) |
| `supabase.auth.verifyOtp({ phone, token, type: 'sms' })` | Supabase Auth |
| `supabase.from('profiles').select/upsert` | `profiles` table |
| `supabase.from('profiles').select` (partner) | `profiles` table |
| `supabase.channel(...).on('postgres_changes', { table: 'pings' })` | Realtime on `pings` table |
| `supabase.channel(...).on('postgres_changes', { table: 'unpair_requests' })` | Realtime on `unpair_requests` table |
| `supabase.functions.invoke('send-ping', { body })` | Edge Function |
| `supabase.functions.invoke('generate-invite-code')` | Edge Function |
| `supabase.functions.invoke('redeem-invite-code', { body: { code } })` | Edge Function |
| `supabase.functions.invoke('initiate-unpair')` | Edge Function |
| `supabase.functions.invoke('confirm-unpair', { body: { requestId } })` | Edge Function |
| `supabase.functions.invoke('decline-unpair', { body: { requestId } })` | Edge Function |
| `supabase.storage.from('moments').upload(...)` | Storage bucket `moments` |
| `supabase.storage.from('moments').getPublicUrl(...)` | Storage bucket `moments` |

When the backend is ready, replace `src/types/database.ts` with Supabase-generated types:
```bash
npx supabase gen types typescript --project-id <id> > src/types/database.ts
```

## Critical gotchas

- **`react-native-reanimated/plugin` must be the last plugin in `babel.config.js`** — moving it breaks the Reanimated worklet system silently.
- **`expo-file-system` v19 (SDK 54) has a new API.** The old `FileSystem.documentDirectory` / `copyAsync` / `makeDirectoryAsync` are removed. Use `expo-file-system/legacy` imports in hooks that need the legacy path-string API (`useSendPing`, `useOfflineQueue`).
- **NativeWind v4 requires Tailwind CSS v3**, not v4. The project pins `tailwindcss@^3.4.x` in `devDependencies`.
- **Supabase session must use `expo-secure-store`** as the storage adapter (not AsyncStorage) — see `src/lib/supabase.ts`. `detectSessionInUrl: false` is required for React Native.
- **`GestureHandlerRootView` must wrap the entire tree** — it's at the top of `app/_layout.tsx`. Without it, gesture-handler gestures fail silently on Android.
- **`Gesture.Pan().minDistance(0)`** is used for the hold-to-ping interaction (not `LongPress`) because it fires `onBegin` immediately on touch and `onEnd` on release, giving us precise hold-duration tracking via `Date.now()`.
- **Offline ping queue photos**: photo URIs from `expo-image-picker` point to OS temp dirs that may be cleared. `useSendPing` copies photos to `FileSystem.documentDirectory + 'ping-moments/'` before queuing.
- **`expo-splash-screen`**: `SplashScreen.preventAutoHideAsync()` is called at module level in `app/_layout.tsx`. It's hidden only after both `sessionLoaded` and `fontsLoaded` are true.
- **Env vars**: use `EXPO_PUBLIC_` prefix — Expo only exposes env vars with this prefix to the client bundle.
