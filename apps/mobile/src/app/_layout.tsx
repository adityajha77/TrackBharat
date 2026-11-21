import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { brand } from "@/components/ui";
import { AuthProvider, useAuth } from "@/lib/auth";

SplashScreen.preventAutoHideAsync();

/**
 * App frame: the sign-in state around everything, the five tabs, and the
 * screens that open on top of them (a seat, a party, log in, the admin panel).
 */
export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <Screens />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Screens() {
  const { ready } = useAuth();
  // Keep the splash screen until we know whether someone is signed in.
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;
  return (
    <Stack screenOptions={{ headerTintColor: brand.saffron, headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="area/[pincode]" options={{ title: "Your area" }} />
      <Stack.Screen name="constituency/[slug]" options={{ title: "Report card" }} />
      <Stack.Screen name="party/[slug]" options={{ title: "Promised vs done" }} />
      <Stack.Screen name="login" options={{ title: "Log in", presentation: "modal" }} />
      <Stack.Screen name="admin/index" options={{ title: "Admin panel" }} />
      <Stack.Screen name="admin/users" options={{ title: "Users & roles" }} />
      <Stack.Screen name="admin/news" options={{ title: "News desk" }} />
      <Stack.Screen name="admin/causes" options={{ title: "Causes" }} />
      <Stack.Screen name="admin/promises" options={{ title: "Promises" }} />
    </Stack>
  );
}
