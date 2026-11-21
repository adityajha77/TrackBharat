import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { brand, Button, Card, Chip, Field, P, Screen, State, Title, useColors } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/use-load";

/**
 * NEWS: stories verified by TrackBharat (our own summary), then the latest press
 * headlines, which open on the publisher's own site. Citizens can suggest a story;
 * it goes to the News desk and appears only after a verifier publishes it.
 */
export default function News() {
  const c = useColors();
  const { user } = useAuth();
  const [state, setState] = useState<string | undefined>();
  const verified = useLoad(() => api.news(), []);
  const heads = useLoad(() => api.headlines(state), [state]);
  const [suggest, setSuggest] = useState({ open: false, url: "", headline: "", busy: false });
  const open = (url: string) => WebBrowser.openBrowserAsync(url);

  const send = async () => {
    setSuggest((s) => ({ ...s, busy: true }));
    try {
      await api.suggestStory(suggest.url.trim(), suggest.headline.trim());
      setSuggest({ open: false, url: "", headline: "", busy: false });
      Alert.alert("Thank you", "A verifier will check it. It appears here once it's published.");
    } catch (e) {
      setSuggest((s) => ({ ...s, busy: false }));
      Alert.alert("Couldn't send", e instanceof Error ? e.message : "Please try again.");
    }
  };

  return (
    <Screen onRefresh={() => (verified.reload(), heads.reload())} refreshing={verified.loading || heads.loading}>
      <Title eyebrow="News">News that needs a voice</Title>
      {!suggest.open ? (
        <Button title="Suggest a story" kind="secondary" onPress={() => (user ? setSuggest((s) => ({ ...s, open: true })) : router.push("/login"))} />
      ) : (
        <Card>
          <Field label="Link to the story" value={suggest.url} onChangeText={(url) => setSuggest((s) => ({ ...s, url }))} placeholder="https://…" autoCapitalize="none" keyboardType="url" />
          <Field label="Headline" value={suggest.headline} onChangeText={(headline) => setSuggest((s) => ({ ...s, headline }))} />
          <Button title={suggest.busy ? "Sending…" : "Send to the News desk"} disabled={suggest.busy || suggest.headline.length < 10 || !suggest.url.startsWith("http")} onPress={send} />
        </Card>
      )}

      {(verified.data?.items.length ?? 0) > 0 && (
        <>
          <Text style={{ color: c.text, fontWeight: "900", fontSize: 18 }}>✓ Verified by TrackBharat</Text>
          {verified.data!.items.map((n) => (
            <Card key={n.id} onPress={() => open(n.url)}>
              <Text style={{ color: brand.green, fontWeight: "800", fontSize: 12 }}>
                {[n.district, n.state].filter(Boolean).join(", ")}
              </Text>
              <Text style={{ color: c.text, fontWeight: "800", fontSize: 16 }}>{n.headline}</Text>
              {n.summary && <P>{n.summary}</P>}
              {n.responsible && <P muted>Responsible: {n.responsible}</P>}
              <P muted>Source: {n.sourceName} ↗</P>
            </Card>
          ))}
        </>
      )}

      <Text style={{ color: c.text, fontWeight: "900", fontSize: 18 }}>Latest from the press</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="All states" active={!state} onPress={() => setState(undefined)} />
        {heads.data?.states.map((s) => (
          <Chip key={s} label={s} active={s === state} onPress={() => setState(s)} />
        ))}
      </ScrollView>
      <State loading={heads.loading && !heads.data} error={heads.error} empty={heads.data && heads.data.items.length === 0 ? "No headlines here yet." : false} onRetry={heads.reload} />
      {heads.data?.items.map((h) => (
        <Card key={h.id} onPress={() => open(h.url)}>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Text style={{ color: c.text, fontWeight: "800", fontSize: 12 }}>{h.sourceName}</Text>
            {h.state && <Text style={{ color: c.muted, fontSize: 12 }}>· {h.state}</Text>}
          </View>
          <Text style={{ color: c.text, fontWeight: "700", fontSize: 15 }}>{h.headline}</Text>
          <Text style={{ color: brand.saffron, fontWeight: "700" }}>Read on {h.sourceName.split(":")[0]} ↗</Text>
        </Card>
      ))}
    </Screen>
  );
}
