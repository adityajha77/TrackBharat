import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import type { NewsItem } from "@trackbharat/shared";
import { brand, Button, Card, Chip, Field, P, Screen, State, Title, useColors } from "@/components/ui";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/use-load";

const CATEGORIES = ["ROADS_INFRASTRUCTURE", "HEALTH", "EDUCATION", "EMPLOYMENT", "WATER", "ELECTRICITY", "AGRICULTURE", "HOUSING", "SAFETY", "ENVIRONMENT", "LOCAL_DEVELOPMENT", "OTHER"];

/**
 * NEWS DESK on the phone: citizen suggestions first, then press headlines.
 * Open the original, write 2–5 lines in your own words, tag the state, publish.
 */
export default function NewsDesk() {
  const { data, error, loading, reload, setData } = useLoad(() => api.newsQueue(), []);
  const items = [...(data?.items ?? [])].sort((a, b) => Number(a.fromFeed) - Number(b.fromFeed));
  const done = (id: number) => data && setData({ items: data.items.filter((i) => i.id !== id) });
  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <Title eyebrow="Admin">News desk</Title>
      <P muted>Never copy the article: summarise it in your own words (60–600 characters).</P>
      <State loading={loading && !data} error={error} empty={data && items.length === 0 ? "Nothing waiting." : false} onRetry={reload} />
      {items.slice(0, 25).map((n) => (
        <Story key={n.id} item={n} onDone={() => done(n.id)} />
      ))}
    </Screen>
  );
}

function Story({ item, onDone }: { item: NewsItem; onDone: () => void }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [state, setState] = useState(item.state ?? "");
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [busy, setBusy] = useState(false);

  const decide = async (decision: "PUBLISH" | "REJECT") => {
    setBusy(true);
    try {
      await api.reviewNews(item.id, decision === "REJECT" ? { decision } : { decision, summary: summary.trim(), state: state.trim(), district: district.trim() || undefined, category });
      onDone();
    } catch (e) {
      Alert.alert("Not saved", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Text style={{ color: item.fromFeed ? c.muted : brand.saffron, fontWeight: "800", fontSize: 12 }}>{item.fromFeed ? item.sourceName : `Suggested by a citizen · ${item.sourceName}`}</Text>
      <Text style={{ color: c.text, fontWeight: "800" }} onPress={() => WebBrowser.openBrowserAsync(item.url)}>
        {item.headline} ↗
      </Text>
      {!open ? (
        <Button title="Review" kind="secondary" onPress={() => setOpen(true)} />
      ) : (
        <View style={{ gap: 8 }}>
          <Field label={`Your summary (${summary.trim().length}/600)`} value={summary} onChangeText={setSummary} multiline style={{ minHeight: 100, textAlignVertical: "top" }} />
          <Field label="State / UT (exactly as on the site)" value={state} onChangeText={setState} placeholder="e.g. Andaman and Nicobar Islands" />
          <Field label="District (optional)" value={district} onChangeText={setDistrict} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {CATEGORIES.map((k) => (
              <Chip key={k} label={k.replace("_", " ").toLowerCase()} active={k === category} onPress={() => setCategory(k)} />
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button title="Publish" disabled={busy || summary.trim().length < 60 || state.trim().length < 2} onPress={() => decide("PUBLISH")} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Reject" kind="danger" disabled={busy} onPress={() => decide("REJECT")} />
            </View>
          </View>
        </View>
      )}
    </Card>
  );
}
