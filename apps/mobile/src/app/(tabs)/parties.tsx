import { router } from "expo-router";
import { Text, View } from "react-native";
import { Card, DoneNotDone, P, Screen, State, Title, useColors } from "@/components/ui";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/use-load";

/** MANIFESTOS: every party, with ✓ done / ✗ not done yet of what it promised while in power. */
export default function Parties() {
  const c = useColors();
  const { data, error, loading, reload } = useLoad(() => api.parties(), []);
  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <Title eyebrow="Manifestos">Promised vs done</Title>
      <P muted>Only promises made by a party that then led the government (central or state) are scored. Every verdict links to its evidence.</P>
      <State loading={loading && !data} error={error} onRetry={reload} />
      {data?.parties.map((p) => (
        <Card key={p.slug} onPress={() => router.push(`/party/${p.slug}`)}>
          <View style={{ height: 6, backgroundColor: p.color, borderRadius: 3 }} />
          <Text style={{ color: c.text, fontWeight: "900", fontSize: 18 }}>{p.name}</Text>
          <P muted>
            {p.shortName} · founded {p.founded.slice(0, 4)} · {p.seatsLokSabha} Lok Sabha seats
          </P>
          {p.promises > 0 ? <DoneNotDone byStatus={p.byStatus} total={p.promises} /> : <P muted>{p.manifestoNote?.text ?? "No promises added yet."}</P>}
        </Card>
      ))}
    </Screen>
  );
}
