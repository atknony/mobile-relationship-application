# Imm: Security and Play Store Readiness Audit

**Date:** 2026-09-19 · **Branch:** `feat/ui-vessel` (at `89e1c19`) · **Supabase project:** `tzhkrhxnfjephtrxbmvp`

## How this was checked

- **Live database.** I queried the real project directly, not just the migration files. That covered:
  - every RLS policy
  - table and column grants
  - function definitions and who can execute them
  - storage buckets
  - the Realtime publication
  - foreign keys and indexes
  - row counts
  - Supabase's own security and performance advisors
- **Code.** I read all four Edge Functions and the client code for auth, sessions, push and uploads.
- **Android permissions.** I read the Android manifest that `expo prebuild` generates.
- **Not verified.** Anything I couldn't see from here is marked **UNVERIFIED**. That includes Supabase Auth dashboard settings, Edge Function secrets, the Expo push settings, and the Play Console account type.

**Severity:** 🔴 blocks launch · 🟠 fix before launch · 🟡 fix soon after · ⚪ note.

---

## 0. Summary: the launch blockers

The app's core security design is stronger than most apps at this stage:
- sessions are kept in the phone's encrypted storage
- one account can only be signed in on one phone, and this is enforced by the database
- `profiles` can only be written column by column
- no client can write to `moments` or `pairs` directly
- invite codes are cryptographically random and single-use
- pushes are sent only by the server

It is **not launchable today**, for the reasons below. Items 1–4 would each get the app rejected or leave it unusable; 5–9 are privacy or security problems a real user could hit.

| # | Blocker | Section |
|---|---|---|
| 1 | **Nobody can sign in to a release build.** Phone OTP has no SMS provider, and the `01`/`02` shortcut is removed from release builds. Play reviewers can't get past the first screen. | [4.1](#41-a-reviewer-must-be-able-to-sign-in-) |
| 2 | **No account deletion.** Play requires deletion both inside the app and on a web page, for any app that creates accounts. | [4.2](#42-account-deletion-in-app-and-on-the-web-) |
| 3 | **No privacy policy.** It must be linked in the Play Console and inside the app, and the Data safety form must match it. | [4.3](#43-privacy-policy-and-data-safety-form-) |
| 4 | **New personal developer accounts must run a closed test** with 12 testers for 14 days before they can publish to production. | [4.4](#44-closed-testing-requirement-for-new-personal-accounts-) |
| 5 | 🔴 **A new partner can read every photo you ever sent to a previous partner.** | [2.1](#21-a-new-partner-can-read-your-old-photos-) |
| 6 | 🟠 **Your partner can read your push token**, and use it to send your phone notifications with any text they like. | [2.2](#22-your-partner-can-read-your-push-token-) |
| 7 | 🟠 **Photos are never deleted from storage**: not when you unpair, and not when an account is deleted. | [3.3](#33-retention-nothing-is-ever-deleted-) |
| 8 | 🟠 **The two test accounts, with their passwords committed to git, live in the same database real users would use.** | [2.4](#24-test-accounts-and-one-shared-supabase-project-) |
| 9 | 🟠 **The app asks for microphone access (`RECORD_AUDIO`) and "display over other apps" (`SYSTEM_ALERT_WINDOW`), and uses neither.** | [4.5](#45-permissions-) |

---

## 1. Performance

### 1.1 Where things stand

| Area | State | Verdict |
|---|---|---|
| Startup | The splash stays up until the session, fonts, language, profile, partner profile and partner photo are ready. A 3 s safety limit stops it hanging. | ✅ Good. It can cost up to about 2 s of splash on a slow network, which is deliberate. |
| Supabase queries | Few and narrow. Profile, partner profile and moments are TanStack Query calls with 5 min / 5 min / 30 s staleness. The moments query uses a `(pair_id, created_at desc)` index and is capped at 50 rows. | ✅ Good for current scale. |
| Realtime | Three channels, each filtered to one row or one pair (`pair_id=eq.…`, `id=eq.…`, `user_id=eq.…`). | ✅ Good. |
| Polling | Only while unpaired: the profile every 3 s, which stops the moment a partner is set. | ✅ Acceptable. Realtime covers it now, so 3 s could become 10 s. |
| Images | Photos are cached on disk by storage path, so a photo is downloaded once for ever. `expo-image` keeps them in memory, avatars and the top of the thread are fetched in advance, and the cache is trimmed to 400 files. | ✅ Very good. |
| Upload size | Live data: moment photos average **325 KB**, the largest is **1 MB**; avatars average 212 KB. They are only cropped to 4:3 at quality 0.7, never resized. | 🟡 See 1.2. |
| Rendering | The vessel animation runs on the UI thread (Reanimated), and the thread list is a `FlatList`. No component uses `React.memo`, but no screen re-renders heavily either. | ✅ Fine. |
| App size | Assets are 68 KB. Three installed packages are never imported: `expo-blur`, `expo-sharing`, `expo-linking`. | 🟡 Remove them. |

### 1.2 What to improve

1. 🟡 **The vessel animation runs every frame for as long as Home is mounted.**
   - `usePingAnimation` writes `clock.value` on every frame, even when idle, to drive the surface wobble.
   - Home stays mounted underneath the Moments and Settings screens, so that loop keeps running while you read the thread or change settings. It costs battery for nothing.
   - **Fix:** `useFrameCallback` returns `setActive`. Turn it off when Home loses focus (`useIsFocused`) and back on when it regains it.
2. 🟡 **Resize photos before uploading.**
   - Scale them to about 1280 px on the long edge at JPEG 0.75, with `expo-image-manipulator` in `uploadImage.ts`.
   - Expected result: roughly 150–250 KB per photo, or 30–60 % less upload time, storage and egress.
   - This matters most on the offline queue, which retries the upload.
3. 🟡 **Fix the database advisors.** They are all cheap:
   - `auth_rls_initplan`: four old policies call `auth.uid()` once per row instead of once per query ("profiles: own read", "profiles: own write", "pairs: member read", "moments: pair read"). Wrap each call as `(select auth.uid())`.
   - `multiple_permissive_policies`: `moments` has **two** SELECT policies that do the same thing ("moments: pair read" from the dashboard era, and "pair members read their moments"). Drop the old one. `profiles: own write` being `FOR ALL` also makes it a second SELECT policy; see 2.3.
   - `unindexed_foreign_keys`: add indexes on `pairs(receiver_id)` and `profiles(partner_id)`. The first matters for every `or(requester_id…, receiver_id…)` lookup in the Edge Functions.
4. ⚪ **Select only the columns you use.** `useProfile` and `usePartnerProfile` use `select('*')`. The cost is negligible, but naming columns ties into the privacy fix in 2.2.
5. ⚪ **Cold Edge Function starts.** The first `send-ping` after a quiet period takes several seconds (measured earlier). If that becomes noticeable, have the app make a cheap call to it on launch to wake it.

---

## 2. Cybersecurity

### What is solid (verified live)

- **RLS is on for every table.** Clients can only read, and only where RLS allows: `authenticated` holds `SELECT` on `active_devices`, `moments`, `pairs` and `profiles`. There are no client write grants on `moments` or `pairs`. `anon` has **no** table grants at all.
- **`profiles` writes are limited to specific columns.**
  - INSERT: `id, username, avatar_url`.
  - UPDATE: `id, username, avatar_url, push_token, locale`.
  - `partner_id` is not client-writable, so the storage policies can trust it.
- **Revoked sessions are cut off everywhere.** Each table and `storage.objects` has a restrictive `live session only` policy, so a revoked session loses database, storage and Realtime access at once. Edge Functions use `getUser()`, which also rejects revoked sessions.
- **Edge Functions check who is calling.** All four have `verify_jwt: true` and look up the caller on the server. `send-ping` only accepts a `photoPath` inside the caller's own folder.
- **Invite codes are hard to guess and hard to reuse.**
  - 6 characters from a 32-character alphabet, via `crypto.getRandomValues`, so about 1.07 billion possibilities with no bias.
  - Valid for 15 minutes and single-use.
  - Redeemed in one conditional UPDATE, so two people can't both claim a code.
  - Pending codes die once either person pairs.
- **Sessions** are stored in `expo-secure-store` (Android Keystore) and tokens refresh automatically.
- **Sign-out and push tokens.** Signing out clears `push_token` while the session is still valid, and claiming the account on a new phone clears it too.
- **No secrets in the repo.**
  - `.env` is not tracked.
  - `google-services.json` and service-account keys are gitignored.
  - The Supabase anon key in the app is public by design.

### 2.1 A new partner can read your old photos 🔴

The policy `read own or partner ping photos` on `storage.objects` allows reading any object in the `moments` bucket whose first folder is your current partner's user id. Photos are stored at `<sender_id>/<local_id>.jpg`.

**Scenario:**
1. B pairs with A and sends A some photos.
2. B unpairs and later pairs with C.
3. C can now list and download **every photo B ever sent**, including all the ones sent to A, through the Storage API: `storage.from('moments').list(B.id)`, then download each one.

The app never does this, but a modified client or a curl command can.

The `moments` *table* policy correctly limits rows to the active pair. The storage policy doesn't follow it.

**Fix (migration):** give storage access through the row that references the photo, not through the folder name:

```sql
drop policy "read own or partner ping photos" on storage.objects;
create policy "read photos of my active pair" on storage.objects
for select to authenticated using (
  bucket_id = 'moments' and (
    (storage.foldername(name))[1] = (select auth.uid())::text      -- my own uploads
    or exists (
      select 1 from public.moments m
      join public.pairs p on p.id = m.pair_id
      where m.photo_path = storage.objects.name
        and p.status = 'active'
        and (select auth.uid()) in (p.requester_id, p.receiver_id)
    )
  )
);
create index if not exists moments_photo_path_idx on public.moments (photo_path) where photo_path is not null;
```

**Still to check.** The app downloads through `createSignedUrl`, which runs under this same policy, so it should keep working. Test it on the dev project first.

**Avatars.** The partner-only avatar policy has the same shape, but only exposes profile pictures, which are shown to the partner anyway. It's acceptable.

### 2.2 Your partner can read your push token 🟠

`profiles: partner read` returns your partner's whole row, and `authenticated` holds SELECT on `push_token`, `locale` and the quiet-hours columns.

With your Expo push token, your partner can send your phone **a notification with any title and body** straight through Expo's push API. No server is involved.
- **Unless** Expo's *Enhanced Security for Push Notifications* is on. With it on, sending needs your `EXPO_ACCESS_TOKEN`, which only `send-ping` holds. **UNVERIFIED** whether it is on: `send-ping` reads the variable, but I can't see the project's secrets.
- The attacker has to be your current partner, which limits the impact. But after a breakup that's exactly the person you'd least want able to do this, and a token only changes when the app is reinstalled.

**Fix. Do both:**
1. Turn on Enhanced Security in the Expo dashboard: Project → Credentials → Push. Then `npx supabase secrets set EXPO_ACCESS_TOKEN=…`.
2. Stop giving partners the column. Either:
   - move `push_token` into its own table `push_tokens(user_id pk, token)` that only its owner can read, and that `send-ping` reads with the service role; or
   - more simply, revoke column SELECT on `push_token` and grant it back only through a `security definer` function `my_push_token()`.

   The client reads its own token back in `usePushRegistration`, only to avoid rewriting an unchanged token. That comparison can move to local storage.

### 2.3 Smaller database findings 🟡

- **`profiles: own write` is `FOR ALL`, applies to every role (`{public}`), and has no `WITH CHECK`.** It's harmless today, because the column grants block anything it would allow and `anon` has no grants. It's fragile, though: one table-wide `grant update` later and the missing `WITH CHECK` lets a user write a row whose `id` isn't theirs.
  - Replace it with `to authenticated` policies for `insert` and `update` that have `with check (id = (select auth.uid()))`.
  - The same cleanup fixes two performance advisors.
- **Old policies still apply to `{public}` instead of `authenticated`:** "profiles: own read", "pairs: member read", "moments: pair read". Re-create them `to authenticated`, or drop them where a newer duplicate exists.
- **`rls_auto_enable()` can be called by anyone,** including `anon` (advisor 0028). It's an event-trigger function, so a direct RPC call just errors, and it has no known exploit. Still: `revoke execute on function public.rls_auto_enable() from public, anon, authenticated;`
- **`claim_active_device()` and `session_is_live()` are SECURITY DEFINER and signed-in users can execute them.** That is intentional and correct: both only act on the caller's own `auth.uid()` and session id. No change needed; this is here so the advisor warning doesn't cause a false alarm.
- **Storage buckets have no size or type limit** (`file_size_limit` and `allowed_mime_types` are null). A client can upload files of any size or type into its own folder, which is a cost-abuse route. Set `moments` and `avatars` to `image/jpeg` only and about 5 MB.
  - A legacy empty bucket, `moment-photos`, can be deleted.
- **Nothing limits how often someone can redeem invite codes or send pings.**
  - Guessing a 6-character code is impractical at current scale: with N open codes, each guess has an N in 1.07 billion chance.
  - Even so, add a per-user limit in `redeem-invite-code`, for example 10 tries per 10 minutes, tracked in a small table.
  - `send-ping` lets a partner flood the other's phone. A soft cap of about 1 per second per sender is enough.
- **Leaked password protection is off** (advisor). It only matters for the email+password test accounts. Once those are gone and sign-in is phone OTP only, it doesn't apply.
- **UNVERIFIED Auth settings to check in the dashboard:**
  - OTP expiry: keep it at 10 minutes or less.
  - OTP send rate limits: protect your SMS bill from SMS-pumping fraud, and enable CAPTCHA (Turnstile or hCaptcha) on phone sign-in if the provider supports it.
  - JWT expiry: the default 1 h is fine.

### 2.4 Test accounts and one shared Supabase project 🟠

- `dev01@imm.test` / `imm-dev-01` and `dev02@imm.test` / `imm-dev-02` are committed in `src/lib/devUsers.ts` and in a migration.
- The shortcut that uses them is removed from release builds, but **the accounts exist in the live database**. Right now they are its only two users: 2 users, 99 moments, 16 photos.
- Anyone who reads the repo can sign in as them with supabase-js.

**Fix:** use **two Supabase projects**:
- `imm-dev`, which keeps the seeded users;
- `imm-prod`, which never has them.

Point EAS's production environment at prod. Then the dev shortcut can't reach real users, even by accident.

### 2.5 Client-side notes ⚪

- **Session storage size.** `expo-secure-store` warns when a stored value is over 2048 bytes, and Supabase sessions can be that large. On Android it works; if it becomes a problem, use the documented "LargeSecureStore" pattern (an AES key in SecureStore, the encrypted session in AsyncStorage).
- **The offline queue stores photos unencrypted** in `documentDirectory/ping-moments/` until they are sent. That's app-private storage. Acceptable, and worth one line in the privacy policy.
- **Crash reporting.** None is set up. That's good for privacy, but you'll be blind to crashes in production. If you add Sentry, turn off PII and screenshots, and list it in the Data safety form.

---

## 3. Data privacy (GDPR / KVKK)

### 3.1 What personal data exists today

| Data | Where | Who can see it | Purpose |
|---|---|---|---|
| Phone number | `auth.users.phone` (Supabase Auth) | Only you, server-side | Sign-in |
| SMS delivery of the code | SMS provider (not chosen yet) | The provider | Sign-in |
| Display name | `profiles.username` | You and your partner | Shown to the partner |
| Profile photo | `avatars` bucket, path in `profiles.avatar_url` | You and your partner | Shown to the partner |
| Ping photos | `moments` bucket | You, your partner (and, until 2.1 is fixed, any later partner) | The product |
| Ping history (who, when, photo reference) | `moments` table | Both members while the pair is active | The thread |
| Pair history (who paired with whom, when, invite codes) | `pairs` table | Both members, including after unpairing | Pairing |
| Expo push token | `profiles.push_token` | You, your partner (see 2.2), Expo | Push delivery |
| App language | `profiles.locale` | You, your partner | Language of push text |
| Session and device record | `auth.sessions`, `active_devices` | Server | Single active device |
| Server logs (IP, user agent) | Supabase platform logs | Supabase | Operations |
| Push content (partner's name, "sent you a photo ping") | Expo → FCM/APNs | Expo, Google, Apple | Delivery |

**Not collected:** no analytics, ads, location, contacts, crash reports or advertising ID.

**Special-category data.** Relationship status is not formally special category under Art. 9 GDPR or Art. 6 KVKK. But intimate photos between partners are highly sensitive in practice, which argues for strict deletion and access control.

### 3.2 Is it handled correctly?

**Good:**
- data minimisation: a phone number, a name and an optional photo
- private buckets, and signed URLs that are never stored
- no third-party trackers

**Gaps:**

1. 🔴 **No privacy notice.**
   - Required by GDPR Art. 13 and KVKK Art. 10 (*aydınlatma yükümlülüğü*).
   - Show it before sign-up, with a link on the phone screen.
   - It must name the controller (you), each purpose and legal basis (performing the contract, Art. 6(1)(b), for all of the above), recipients and processors (Supabase, Expo, Google FCM, Apple APNs, the SMS provider), international transfers, retention periods, and the user's rights, including how to exercise them.
2. 🔴 **No right to erasure.** Covered in 4.2, and it must include storage objects (3.3).
3. 🟠 **International transfers.**
   - Supabase, Expo, FCM and APNs are US-based. **UNVERIFIED:** which region the Supabase project is in (Dashboard → Settings → General).
   - **GDPR:** rely on the processors' DPAs and SCCs. Sign Supabase's DPA (available in the dashboard).
   - **KVKK:** since the 2024 amendment to Art. 9, transfers abroad need an adequacy decision (none exists yet), or appropriate safeguards such as the Board's **standard contract**. A standard contract must be **notified to the KVKK Authority within 5 business days of signing**.
   - Hosting the database in an EU region reduces GDPR exposure, but does not remove the KVKK transfer question.
4. 🟠 **VERBİS (Turkey's register of data controllers).**
   - Register if you don't meet the Board's exemption criteria. As published, small controllers are exempt below the employee and turnover thresholds, provided processing special categories isn't their main activity.
   - **Confirm the current thresholds with a Turkish lawyer.** This audit isn't legal advice.
5. 🟠 **Retention isn't defined or enforced.** See 3.3.
6. 🟡 **Access and portability** (GDPR Art. 15/20, KVKK Art. 11).
   - A "Download my data" option is not required for Play, but requests must be answered within 30 days.
   - At minimum, publish a contact email. Later, an Edge Function could zip the profile, moments and photos.
7. 🟡 **Age.** State a minimum age (16+ satisfies GDPR Art. 8 in most EU states without parental consent; 18+ is simpler for a couples app) in the terms, and set the same target age in Play.

### 3.3 Retention: nothing is ever deleted 🟠

Verified from the live foreign keys:

- **Unpairing** sets `pairs.status = 'dissolved'`. Every `moments` row and every photo in storage stays **forever**.
- **Deleting an `auth.users` row cascades** to profile → pairs → `moments` rows. But:
  - **storage objects are not cascaded.** Every photo and avatar becomes an orphan that still exists and can still be served to anyone the storage policy allows;
  - the cascade also deletes the **partner's** half of the shared history: photos they sent you vanish from their thread. Decide deliberately whether that's what you want;
  - the partner's app isn't told. `profiles.partner_id` becomes NULL through `ON DELETE SET NULL`, but the pair row is **deleted**, not updated, and `usePairRealtime` listens for updates.

**Recommended policy (write it into the privacy notice):**
- **Unpair:** delete that pair's moment photos from storage and the `moments` rows after a short grace period (e.g. 30 days), or at once, which fits "one line between two people" best. A scheduled Edge Function or `pg_cron` job can do it.
- **Delete account:** at once, remove both photo folders, the profile, the pairs and moments, the push token and the auth user. Tell the partner through Realtime.
- **Unfinished sign-ups:** clean up pending invites older than 15 minutes, and auth users who never completed onboarding after N days.

---

## 4. Google Play Store approval

### 4.1 A reviewer must be able to sign in 🔴

A release build only offers phone OTP, and **no SMS provider is configured**, so `signInWithOtp` fails. Play rejects apps reviewers can't use.

**To do:**
1. Configure an SMS provider in Supabase Auth: Twilio, MessageBird, Vonage, or Twilio Verify. Budget for SMS costs and turn on rate limits and CAPTCHA (2.3).
2. Add **test phone numbers** in Supabase Auth: fixed number → fixed code, with no SMS sent.
3. In Play Console → App content → **App access**, choose "All or some functionality is restricted" and give the reviewer:
   - two test numbers with their codes, or one number plus a pre-paired partner account, so they can reach Home;
   - instructions ("enter number, code is 123456; the app is for two people, account B is already paired").

   The app is useless alone, so seed the reviewer's account already paired, or tell them to pair two numbers on two devices.

### 4.2 Account deletion: in the app and on the web 🔴

Play policy has required this since 2024 for any app that lets users create accounts.

**In the app:**
- A "Delete account" option in Settings, with a clear confirmation that it can't be undone.
- It calls a new `delete-account` Edge Function (service role) that:
  1. dissolves the active pair and tells the partner (update the pair row first, so `usePairRealtime` fires, then delete);
  2. removes `moments/<uid>/*` and `avatars/<uid>/*` from storage;
  3. deletes the `auth.users` row (`supabase.auth.admin.deleteUser`), which cascades to `profiles`, `pairs`, `moments` and `active_devices`;
  4. the app then clears the local caches, as sign-out does.

**On the web:**
- A public page where someone who has already uninstalled can request deletion. A form or an email address is acceptable.
- Put its URL in the Data safety form ("Delete account URL").

**Say what is deleted and what is kept**, and for how long (for example, "server logs for up to 90 days").

### 4.3 Privacy policy and Data safety form 🔴

- **Privacy policy:**
  - A public URL (not a PDF or Google Doc that needs a sign-in), entered in Play Console → App content.
  - Linked **inside the app**: on the sign-up screen, and in Settings next to "Delete account".
  - Content as in 3.2 item 1.
- **Data safety form** (must match the policy and the app's real behaviour):
  - **Collected:**
    - Personal info → Phone number (account management), Name (app functionality)
    - Photos (app functionality)
    - Messages → "Other in-app messages" (the pings)
    - Device or other IDs (the push token; app functionality)
  - **Shared with third parties:** Play treats data your service providers handle for you as *not shared*, so the answer is "No", provided Supabase, Expo and the SMS provider only process on your behalf.
  - **Encrypted in transit:** yes (HTTPS/WSS everywhere).
  - **Users can request deletion:** yes, once 4.2 exists.
- **Terms of use.** Not required by Play, but recommended. They're also where the content rules in 4.6 live.

### 4.4 Closed testing requirement for new personal accounts 🔴

A **personal** Play Console developer account created after November 2023 must:
- run a **closed test with at least 12 testers who stay opted in for 14 days in a row**;
- then answer a questionnaire before production access is granted.

**UNVERIFIED** which account type you have. An organisation account (with a D-U-N-S number) is exempt.

Start this as early as possible, because it's two weeks of calendar time you can't speed up. A closed-testing build needs items 4.1 to 4.3 done anyway.

### 4.5 Permissions 🟠

These come from the manifest `expo prebuild` generates (`android/app/src/main/AndroidManifest.xml`):

| Permission | Where it comes from | Used? | Action |
|---|---|---|---|
| `RECORD_AUDIO` | the `expo-image-picker` plugin adds it by default (for video) | **No**, photos only | Remove: add `"microphonePermission": false` to the plugin config in `app.json`. Play questions unused sensitive permissions, and users see "microphone" at install time. |
| `SYSTEM_ALERT_WINDOW` | development-client tooling | **No**, not in release | Add `"blockedPermissions": ["android.permission.SYSTEM_ALERT_WINDOW"]` under `android` in `app.json`. Also check the permissions actually merged into a production AAB. |
| `READ/WRITE_EXTERNAL_STORAGE` (`maxSdkVersion` 32) | image picker on Android 12 and older | Yes, old Android only | OK. |
| `CAMERA` (merged from the library) | `launchCameraAsync` | Yes | OK. The rationale text exists. |
| `POST_NOTIFICATIONS` (merged from the library) | `expo-notifications` | Yes | OK. |
| `VIBRATE`, `INTERNET` | – | Yes | OK. |

- **Photo access.** Choosing from the gallery uses the Android system photo picker (no `READ_MEDIA_IMAGES`). That meets Play's *Photo and Video Permissions* policy, which since 2025 only allows the broad media permission for apps whose core purpose needs it. **Keep it that way**, and check that no library adds `READ_MEDIA_IMAGES` to the merged manifest (`./gradlew :app:processReleaseMainManifest`, then read the merged file).
- **Permission prompts.**
  - The notification prompt appears as soon as Home first opens, with no explanation.
  - That's allowed, but a one-line explanation first ("Pings arrive as notifications, allow them?") gets far more people to say yes. A "no" on Android 13+ is effectively permanent.
  - The camera prompt appears in context (when taking a photo), which is correct.
- **The permission text still says "moment":** "…so you can send a moment to your partner". Change it to "photo ping", and consider translating it (`expo-localization` locale-specific strings; that needs a rebuild).

### 4.6 Content policy: a private photo-sharing app 🟠

The app lets users send photos to each other, so Play reviewers will look at:

- **User Generated Content.** Private one-to-one sharing between consenting paired users carries lighter duties than a public feed, but you should still:
  - publish terms that forbid illegal and non-consensual content;
  - provide a way to **report** a problem (at minimum a "Report a problem" email link in Settings);
  - provide a way to **block**. Unpair already does this, and pairing needs mutual consent, which helps.
- **Child Safety Standards.** If you categorise the app as **Social** or **Dating**, Play requires:
  - published standards against child sexual abuse and exploitation (CSAE);
  - an in-app way to report;
  - a named child-safety contact;
  - a statement that you comply with child-safety law.

  Categorising it as **Lifestyle** may avoid the formal declaration, but having the standards is cheap and protects you anyway.
- **Target audience.** Declare 18+ (or 16+) in Play Console → Target audience and content, consistent with the terms.

### 4.7 Build and listing checklist 🟠

- **Target API level.**
  - New apps must target Android 15 (API 35) now, and Android 16 (API 36) from Aug 31, 2026.
  - Expo SDK 57 / RN 0.86 should already target 36. **Verify** in the production build (`targetSdkVersion` in `android/build.gradle` resolves from `expo-build-properties` or the SDK defaults).
- **Production build environment.**
  - `.env` isn't committed, so an EAS **production** build currently has no `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and the app would start broken.
  - Create them in the EAS `production` environment (point them at the prod project from 2.4), together with `GOOGLE_SERVICES_JSON`.
  - Add `"environment": "production"` to the production profile in `eas.json`.
- **Signing:** let EAS manage the upload key, and enroll in Play App Signing (the default).
- **App icon.** `icon.png` and `adaptive-icon.png` are 1024² files from May 18, when the project was created, and `adaptive-icon.png` is byte-identical to `splash-icon.png`.
  - They look like the Expo template placeholders. Confirm.
  - The adaptive icon background is `#ffffff`, not the brand ground colour.
  - The Play listing also needs a 512×512 icon, a 1024×500 feature graphic and at least 2 phone screenshots.
- **`app.json` → `ios.supportsTablet: true`.** Irrelevant for Play; review it before any App Store submission.
- **Remove unused dependencies:** `expo-blur`, `expo-sharing`, `expo-linking` (1.1). The `expo-sharing` config plugin is still listed in `app.json` too.

---

## 5. Recommended order of work

1. **Separate the projects (2.4) and set production env vars (4.7).** Everything else should be built and tested against a clean prod project.
2. **Security migrations (2.1, 2.3, performance advisors 1.2.3).** One migration, tested on dev first.
3. **Push token (2.2):** turn on Expo Enhanced Security, then move or revoke the column.
4. **SMS provider, test numbers and rate limits (4.1, 2.3).**
5. **Account deletion (4.2) plus the retention jobs (3.3).** They share most of their code.
6. **Privacy policy, terms and CSAE page on a small public site, plus links in the app (4.3, 4.6, 3.2).**
7. **Permission cleanup, notification explanation, "moment" text (4.5).**
8. **Photo resizing and pausing the frame loop (1.2).**
9. **Icons and store listing, then start the 14-day closed test (4.4, 4.7).**
10. **Legal: sign Supabase's DPA, KVKK standard contract and its notification, VERBİS check (3.2).**

Items 2, 3, 5 and 7 are code I can do next. Items 4, 6 and 10 need your accounts, decisions or a lawyer.
