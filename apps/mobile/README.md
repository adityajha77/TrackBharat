# TrackBharat mobile app (Android & iPhone)

Built with **Expo** (React Native). It uses the same live API, accounts and data as the website.

| Tab | What it does |
|---|---|
| Home | Enter a PIN code → your MP and MLA → their report card |
| Causes | India's Causes of the Week: vote "affects me" / "not my issue" |
| News | Verified stories, latest press headlines (open on the publisher's site), suggest a story |
| Manifestos | Every party: ✓ done / ✗ not done yet, each promise with its evidence |
| Account | Log in (Google or email), your activity, **Admin panel** for staff |

**Admin panel in the app** (staff only; the API checks the role on every request): overview, News desk (publish or
reject suggestions), users & roles (admins), Causes (moderators), promise status updates (verifiers).

## Run it on your phone (development)

1. Install **Expo Go** from the Play Store / App Store.
2. In this folder: `npm install`, then `npx expo start`.
3. Scan the QR code with Expo Go (Android) or the Camera app (iPhone). The app talks to the live API by default.

To use your local API instead: `EXPO_PUBLIC_API_URL=http://<your computer's Wi-Fi IP>:4000 npx expo start`
(a phone can't reach `localhost` on your computer), and add that origin to the API's `CORS_ORIGINS` for the web preview.

**Google sign-in** returns to the app through its own address, `trackbharat://auth`. That works in a real build
(below), not inside Expo Go (which has its own address). Email + password works everywhere.

## Build an installable app

Builds run on Expo's servers (free tier available); no Android Studio or Xcode needed.

```bash
npm install -g eas-cli        # once
eas login                     # your free expo.dev account
eas build --profile preview --platform android    # → an .apk link you can install on any Android phone
eas build --profile production --platform android # → .aab for the Play Store
```

For the Play Store you need a Google Play developer account (one-time US$25).

## Checks

```bash
npx tsc --noEmit      # types (shared with the API via packages/shared)
npx expo lint         # lint, incl. React Compiler rules
npx expo-doctor       # Expo's health checks
npx expo export --platform android   # proves the whole app bundles
```
