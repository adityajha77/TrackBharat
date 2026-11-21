/**
 * Where the app talks to. The live API by default; for local development run
 * `EXPO_PUBLIC_API_URL=http://<your-computer's-LAN-IP>:4000 npx expo start`
 * (a phone can't reach "localhost" on your computer).
 * EXPO_PUBLIC_* values are built into the app; never put secrets in them.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://trackbharat-api.onrender.com").replace(/\/$/, "");
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://track-bharat.vercel.app").replace(/\/$/, "");

/** Must match app.json "scheme" and APP_RETURN_URL in apps/api/src/modules/auth/google.ts. */
export const APP_SCHEME = "trackbharat";
