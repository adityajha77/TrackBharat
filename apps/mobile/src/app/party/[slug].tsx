import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Badge, brand, Card, DoneNotDone, P, Screen, State, Title, useColors } from "@/components/ui";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/use-load";

const COLOR: Record<string, string> = { FULFILLED: brand.green, PARTIAL: brand.saffron, IN_PROGRESS: brand.navy, BROKEN: brand.danger };
const LABEL: Record<string, string> = { FULFILLED: "Fulfilled", PARTIAL: "Partly done", IN_PROGRESS: "In progress", BROKEN: "Broken", NOT_RATED: "Not yet rated", NOT_IN_POWER: "Didn't form govt" };

/** One party: the score, then each manifesto's promises with status and evidence links. */
export default function Party() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const c = useColors();
  const { data: p, error, loading, reload } = useLoad(() => api.party(slug), [slug]);
  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <State loading={loading && !p} error={error} onRetry={reload} />
      {p && (
        <>
          <Title eyebrow={`${p.shortName ?? ""} · founded ${p.founded.slice(0, 4)}`}>{p.name}</Title>
          <P muted>{p.ideologyQuote}</P>
          <Card>
            <DoneNotDone byStatus={p.byStatus} total={p.promises} />
            {p.manifestoNote && <P muted>{p.manifestoNote.text}</P>}
          </Card>
          {p.manifestos.map((m) => (
            <View key={m.id} style={{ gap: 8 }}>
              <Text style={{ color: c.text, fontWeight: "900", fontSize: 18 }}>
                {m.electionYear} · {m.state ?? "Lok Sabha"}
              </Text>
              <P muted>
                {m.title} · {m.formedGovernment ? "formed the government" : "didn't form the government"}
              </P>
              {m.promises.map((pr) => (
                <Card key={pr.id} onPress={pr.evidenceUrl ? () => WebBrowser.openBrowserAsync(pr.evidenceUrl!) : undefined}>
                  <Text style={{ color: c.text, fontWeight: "700" }}>{pr.text}</Text>
                  <Badge label={LABEL[pr.status] ?? pr.status} color={COLOR[pr.status]} />
                  {pr.statusNote && <P muted>{pr.statusNote}</P>}
                  {pr.evidenceUrl && <Text style={{ color: brand.saffron, fontWeight: "700" }}>Evidence ↗</Text>}
                </Card>
              ))}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
