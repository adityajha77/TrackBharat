import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Badge, Card, P, Screen, State, Title, useColors } from "@/components/ui";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/use-load";

/** A PIN code's Lok Sabha and Vidhan Sabha seats, and who represents each. */
export default function Area() {
  const { pincode } = useLocalSearchParams<{ pincode: string }>();
  const c = useColors();
  const { data, error, loading, reload } = useLoad(() => api.pincode(pincode), [pincode]);
  const seats = data?.constituencies ?? [];
  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <Title eyebrow={`PIN ${pincode}`}>Your representatives</Title>
      <State loading={loading && !data} error={error} empty={data && seats.length === 0 ? "We couldn't place this PIN code in a constituency yet." : false} onRetry={reload} />
      {(["LOK_SABHA", "VIDHAN_SABHA"] as const).map((house) => {
        const list = seats.filter((s) => s.house === house);
        if (!list.length) return null;
        return (
          <View key={house} style={{ gap: 10 }}>
            <Text style={{ color: c.text, fontWeight: "900", fontSize: 18 }}>{house === "LOK_SABHA" ? "Member of Parliament (Lok Sabha)" : "MLA (Vidhan Sabha)"}</Text>
            {list.map((s) => (
              <Card key={s.slug} onPress={() => router.push(`/constituency/${s.slug}`)}>
                <Text style={{ color: c.text, fontWeight: "800", fontSize: 17 }}>{s.representative?.name ?? "Seat vacant / no data yet"}</Text>
                {s.representative?.party && <P muted>{s.representative.party}</P>}
                <P>
                  {s.name}, {s.state}
                </P>
                {list.length > 1 && <Badge label={`${Math.round(s.share * 100)}% of this PIN`} />}
                <P muted>Tap for the report card →</P>
              </Card>
            ))}
          </View>
        );
      })}
    </Screen>
  );
}
