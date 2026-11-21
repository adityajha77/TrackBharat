import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Badge, brand, Button, Card, P, Screen, State, Title, useColors } from "@/components/ui";
import { api } from "@/lib/api";
import { WEB_URL } from "@/lib/config";
import { useLoad } from "@/lib/use-load";

const STATUS_COLOR: Record<string, string> = { FULFILLED: brand.green, PARTIAL: brand.saffron, IN_PROGRESS: brand.navy, BROKEN: brand.danger, STALLED: "#777" };

/** A seat's report card: who represents it, and their promises with status. */
export default function Constituency() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const c = useColors();
  const { data, error, loading, reload } = useLoad(() => api.constituency(slug), [slug]);
  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <State loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <>
          <Title eyebrow={`${data.house === "LOK_SABHA" ? "Lok Sabha" : "Vidhan Sabha"} · ${data.state}`}>{data.name}</Title>
          {data.representatives.length === 0 && <P muted>No sitting representative on record.</P>}
          {data.representatives.map((r) => (
            <Card key={r.name}>
              <Text style={{ color: c.text, fontWeight: "900", fontSize: 18 }}>{r.name}</Text>
              {r.party && <P>{r.party.name}</P>}
              <P muted>
                {[r.education, r.profession].filter(Boolean).join(" · ")}
                {r.termsServed ? ` · term ${r.termsServed}` : ""}
              </P>
              <P muted>Source: {r.source.publisher}</P>
            </Card>
          ))}

          <Text style={{ color: c.text, fontWeight: "900", fontSize: 18 }}>Promises ({data.promises.length})</Text>
          {data.promises.length === 0 && <P muted>No sourced promises for this seat yet. You can suggest one on the website.</P>}
          {data.promises.map((p) => (
            <Card key={p.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ color: c.text, fontWeight: "700", flex: 1 }}>{p.title}</Text>
                <Badge label={p.status.replace("_", " ")} color={STATUS_COLOR[p.status]} />
              </View>
              <P muted>
                {p.madeBy}
                {p.madeOn ? ` · ${p.madeOn}` : ""}
              </P>
            </Card>
          ))}
          <Button title="Full report card on the website" kind="secondary" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/constituency/${slug}`)} />
        </>
      )}
    </Screen>
  );
}
