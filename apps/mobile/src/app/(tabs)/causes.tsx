import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import type { Cause } from "@trackbharat/shared";
import { brand, Card, P, Screen, State, Title, useColors } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/use-load";

const CATEGORY: Record<string, string> = {
  ROADS_INFRASTRUCTURE: "Roads & infrastructure", HEALTH: "Health", EDUCATION: "Education", EMPLOYMENT: "Jobs", WATER: "Water",
  ELECTRICITY: "Electricity", AGRICULTURE: "Agriculture", HOUSING: "Housing", SAFETY: "Safety", ENVIRONMENT: "Environment",
  LOCAL_DEVELOPMENT: "Local development", OTHER: "Other",
};

/** INDIA'S CAUSES OF THE WEEK: vote "affects me" / "not my issue". */
export default function Causes() {
  const { user } = useAuth();
  const { data, error, loading, reload, setData } = useLoad(() => api.causes(), [user?.id]);
  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <Title eyebrow="This week">India&apos;s Causes</Title>
      <P muted>Picked every Monday from what citizens reported across India. Votes from verified accounts count.</P>
      <State loading={loading && !data} error={error} empty={data && data.causes.length === 0 ? "No causes this week yet. They're picked on Monday." : false} onRetry={reload} />
      {data?.causes.map((cause) => (
        <CauseCard
          key={cause.id}
          cause={cause}
          signedIn={!!user}
          onVoted={(updated) => setData({ ...data, causes: data.causes.map((x) => (x.id === updated.id ? updated : x)) })}
        />
      ))}
    </Screen>
  );
}

function CauseCard({ cause, signedIn, onVoted }: { cause: Cause; signedIn: boolean; onVoted: (c: Cause) => void }) {
  const c = useColors();
  const [busy, setBusy] = useState(false);
  const vote = async (value: 1 | -1) => {
    if (!signedIn) return router.push("/login");
    setBusy(true);
    try {
      const next = cause.myVote === value ? 0 : value; // the same vote again takes it back
      const res = await api.voteCause(cause.id, next);
      onVoted({ ...cause, up: res.up, down: res.down, myVote: res.myVote });
    } catch (e) {
      Alert.alert("Couldn't vote", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const btn = (value: 1 | -1, label: string, count: number) => {
    const active = cause.myVote === value;
    return (
      <Pressable
        disabled={busy}
        onPress={() => vote(value)}
        style={{ flex: 1, borderWidth: 2, borderColor: c.border, borderRadius: 8, paddingVertical: 10, alignItems: "center", backgroundColor: active ? (value === 1 ? brand.green : brand.danger) : c.surface }}
      >
        <Text style={{ color: active ? "#fff" : c.text, fontWeight: "800" }}>
          {label} · {count}
        </Text>
      </Pressable>
    );
  };
  return (
    <Card>
      <Text style={{ color: c.text, fontWeight: "900", fontSize: 18 }}>
        {cause.pinned ? "📌 " : ""}
        {cause.title ?? CATEGORY[cause.category]}
      </Text>
      {cause.blurb && <P>{cause.blurb}</P>}
      <P muted>
        {cause.issueCount} reports from {cause.stateCount} states
      </P>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
        {btn(1, "▲ Affects me", cause.up)}
        {btn(-1, "▼ Not my issue", cause.down)}
      </View>
    </Card>
  );
}
