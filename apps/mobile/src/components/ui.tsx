import type { ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme, type TextInputProps, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * The app's small design system: the same "brutalist" look as the website
 * (thick ink borders, hard offset shadows, saffron and green accents).
 */
export const brand = { saffron: "#FF9933", green: "#138808", navy: "#000080", danger: "#C2362B" };

export function useColors() {
  const dark = useColorScheme() === "dark";
  return dark
    ? { bg: "#15161A", surface: "#1E2026", ink: "#F2EFE6", text: "#F2EFE6", muted: "#A7A9B0", border: "#F2EFE6" }
    : { bg: "#F6F2E8", surface: "#FFFFFF", ink: "#111111", text: "#111111", muted: "#5B5D66", border: "#111111" };
}

/** A scrolling screen with pull-to-refresh and safe-area padding. */
export function Screen({ children, onRefresh, refreshing = false }: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  const c = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView
        // On the web preview the tab bar floats at the top; on phones it sits at the bottom.
        contentContainerStyle={{ padding: 16, paddingTop: Platform.OS === "web" ? 80 : 16, paddingBottom: 120, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Title({ children, eyebrow }: { children: ReactNode; eyebrow?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      {eyebrow && <Text style={{ color: brand.saffron, fontWeight: "700", letterSpacing: 2, fontSize: 11 }}>{eyebrow.toUpperCase()}</Text>}
      <Text style={{ color: c.text, fontSize: 28, fontWeight: "900" }}>{children}</Text>
    </View>
  );
}

export function P({ children, muted = false, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  const c = useColors();
  return <Text style={[{ color: muted ? c.muted : c.text, fontSize: 15, lineHeight: 21 }, style]}>{children}</Text>;
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const c = useColors();
  const box: ViewStyle = { backgroundColor: c.surface, borderColor: c.border, borderWidth: 2, borderRadius: 8, padding: 14, gap: 6, shadowColor: c.ink, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 };
  if (!onPress) return <View style={[box, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [box, style, pressed && { transform: [{ translateX: 2 }, { translateY: 2 }], shadowOffset: { width: 2, height: 2 } }]}>
      {children}
    </Pressable>
  );
}

export function Button({ title, onPress, kind = "primary", disabled = false }: { title: string; onPress: () => void; kind?: "primary" | "secondary" | "danger"; disabled?: boolean }) {
  const c = useColors();
  const bg = kind === "primary" ? brand.saffron : kind === "danger" ? brand.danger : c.surface;
  const fg = kind === "secondary" ? c.text : kind === "danger" ? "#fff" : "#111";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, borderColor: c.border, opacity: disabled ? 0.5 : 1 }, pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] }]}
    >
      <Text style={{ color: fg, fontWeight: "800", fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const c = useColors();
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: c.text, fontWeight: "600" }}>{label}</Text>
      <TextInput placeholderTextColor={c.muted} {...rest} style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }, style]} />
    </View>
  );
}

export function Chip({ label, active = false, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={[styles.chip, { borderColor: c.border, backgroundColor: active ? brand.saffron : c.surface }]}>
      <Text style={{ color: active ? "#111" : c.text, fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, color }: { label: string; color?: string }) {
  const c = useColors();
  return (
    <View style={{ borderWidth: 1.5, borderColor: color ?? c.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1, alignSelf: "flex-start", backgroundColor: color ?? "transparent" }}>
      <Text style={{ color: color ? "#fff" : c.text, fontSize: 11, fontWeight: "800" }}>{label.toUpperCase()}</Text>
    </View>
  );
}

/** Loading / error / empty states in one place. */
export function State({ loading, error, empty, onRetry }: { loading: boolean; error: string | null; empty?: string | false; onRetry?: () => void }) {
  if (loading)
    return (
      <View style={{ padding: 24, alignItems: "center", gap: 8 }}>
        <ActivityIndicator size="large" color={brand.saffron} />
        <P muted>Loading… (the free server may take a few seconds to wake up)</P>
      </View>
    );
  if (error)
    return (
      <Card>
        <P style={{ color: brand.danger }}>{error}</P>
        {onRetry && <Button title="Try again" kind="secondary" onPress={onRetry} />}
      </Card>
    );
  if (empty)
    return (
      <Card>
        <P muted>{empty}</P>
      </Card>
    );
  return null;
}

/** ✓ done / ✗ not done yet: the same headline numbers as the website's party cards. */
export function DoneNotDone({ byStatus, total }: { byStatus: Record<string, number>; total: number }) {
  const accountable = total - (byStatus.NOT_IN_POWER ?? 0);
  if (accountable <= 0) return null;
  const done = byStatus.FULFILLED ?? 0;
  const pct = Math.round((done / accountable) * 100);
  return (
    <View style={{ flexDirection: "row", gap: 14, flexWrap: "wrap" }}>
      <Text style={{ color: brand.green, fontWeight: "900" }}>
        ✓ {done} done ({pct}%)
      </Text>
      <Text style={{ color: brand.danger, fontWeight: "900" }}>
        ✗ {accountable - done} not done yet ({100 - pct}%)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { borderWidth: 2, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center" },
  input: { borderWidth: 2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  chip: { borderWidth: 2, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
});
