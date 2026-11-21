import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import type { AuthResponse, PublicUser } from "@trackbharat/shared";
import { api, ApiError, setApiToken } from "./api";
import { API_URL, APP_SCHEME } from "./config";

/**
 * SIGN-IN STATE for the app.
 *
 * The API gives a session token at log-in (the same kind the website keeps in a
 * cookie). The app keeps it in the phone's secure storage (Keychain / Keystore),
 * never in plain storage, and sends it as "Authorization: Bearer …".
 *
 * Google: the app opens the API's /auth/google/start?client=app in the system
 * browser. After Google, the API sends the browser to trackbharat://auth?code=…
 * (a one-time, 2-minute code), the browser hands that back to the app, and the
 * app swaps the code for a session. The token never appears in a URL.
 */
const KEY = "tb_session";
const store = {
  get: () => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.getItem(KEY) ?? null) : SecureStore.getItemAsync(KEY)),
  set: (v: string) => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.setItem(KEY, v)) : SecureStore.setItemAsync(KEY, v)),
  remove: () => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.removeItem(KEY)) : SecureStore.deleteItemAsync(KEY)),
};

type Auth = {
  user: PublicUser | null;
  ready: boolean;
  isStaff: boolean;
  login(email: string, password: string): Promise<void>;
  signup(name: string, email: string, password: string): Promise<void>;
  loginWithGoogle(): Promise<void>;
  logout(): Promise<void>;
};
const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);

  // On start: restore the saved session and check it's still valid.
  useEffect(() => {
    (async () => {
      const saved = await store.get();
      if (saved) {
        setApiToken(saved);
        try {
          setUser(await api.me());
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) {
            await store.remove(); // expired or logged out elsewhere
            setApiToken(null);
          }
        }
      }
      setReady(true);
    })();
  }, []);

  const begin = useCallback(async (res: AuthResponse) => {
    await store.set(res.token);
    setApiToken(res.token);
    setUser(res.user);
  }, []);

  const value = useMemo<Auth>(
    () => ({
      user,
      ready,
      isStaff: !!user && user.role !== "CITIZEN",
      login: async (email, password) => begin(await api.login(email.trim().toLowerCase(), password)),
      signup: async (name, email, password) => begin(await api.signup(name.trim(), email.trim().toLowerCase(), password)),
      loginWithGoogle: async () => {
        const returnUrl = Linking.createURL("auth", { scheme: APP_SCHEME });
        const result = await WebBrowser.openAuthSessionAsync(`${API_URL}/v1/auth/google/start?client=app`, returnUrl);
        if (result.type !== "success") return; // closed or cancelled
        const params = new URL(result.url).searchParams;
        const error = params.get("error");
        if (error) throw new Error(error === "google_cancelled" ? "Google sign-in was cancelled." : "Google sign-in didn't work. Please try again.");
        const code = params.get("code");
        if (code) await begin(await api.googleExchange(code));
      },
      logout: async () => {
        await api.logout().catch(() => undefined); // end it on the server too
        await store.remove();
        setApiToken(null);
        setUser(null);
      },
    }),
    [user, ready, begin],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
