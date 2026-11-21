import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { brand, Button, Card, Chip, Field, P, Screen, Title, useColors } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { WEB_URL } from "@/lib/config";

WebBrowser.maybeCompleteAuthSession(); // finishes the Google sign-in hand-back on web builds

/** LOG IN / SIGN UP: Google (recommended) or email and password. */
export default function Login() {
  const c = useColors();
  const { login, signup, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/account");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Title eyebrow="TrackBharat">{mode === "login" ? "Welcome back" : "Join TrackBharat"}</Title>
      <Button title="Continue with Google" disabled={busy} onPress={() => run(loginWithGoogle)} />
      <Text style={{ color: c.muted, textAlign: "center" }}>or with email</Text>
      <Card>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip label="Log in" active={mode === "login"} onPress={() => setMode("login")} />
          <Chip label="Sign up" active={mode === "signup"} onPress={() => setMode("signup")} />
        </View>
        {mode === "signup" && <Field label="Your name" value={name} onChangeText={setName} autoComplete="name" />}
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "login" ? "current-password" : "new-password"} />
        {error && <P style={{ color: brand.danger }}>{error}</P>}
        <Button
          title={busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          disabled={busy || !email || password.length < (mode === "signup" ? 10 : 1) || (mode === "signup" && name.trim().length < 2)}
          onPress={() => run(() => (mode === "login" ? login(email, password) : signup(name, email, password)))}
        />
        {mode === "signup" && <P muted>At least 10 characters. By signing up you confirm you are 18+ and agree to the terms and privacy policy.</P>}
      </Card>
      <Button title="Forgot password?" kind="secondary" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/forgot-password`)} />
    </Screen>
  );
}
