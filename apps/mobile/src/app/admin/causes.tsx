import { useState } from "react";
import { Alert, Switch, Text, View } from "react-native";
import type { Cause } from "@trackbharat/shared";
import { brand, Button, Card, Field, P, Screen, State, Title, useColors } from "@/components/ui";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/use-load";

/** CAUSES (moderators and admins): reword a cause or pin it to the top. */
export default function Causes() {
  const { data, error, loading, reload } = useLoad(() => api.causes(), []);
  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <Title eyebrow="Admin">Causes of the Week</Title>
      <P muted>Leave the title empty to use the category name. The weekly job keeps your edits.</P>
      <State loading={loading && !data} error={error} empty={data && data.causes.length === 0 ? "No causes this week yet." : false} onRetry={reload} />
      {data?.causes.map((c) => (
        <CauseEditor key={c.id} cause={c} onSaved={reload} />
      ))}
    </Screen>
  );
}

function CauseEditor({ cause, onSaved }: { cause: Cause; onSaved: () => void }) {
  const c = useColors();
  const [title, setTitle] = useState(cause.title ?? "");
  const [pinned, setPinned] = useState(cause.pinned);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.updateCause(cause.id, { title: title.trim() || null, pinned });
      onSaved();
    } catch (e) {
      Alert.alert("Not saved", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <Text style={{ color: c.muted, fontWeight: "700", fontSize: 12 }}>
        {cause.category.replace("_", " ")} · {cause.issueCount} reports · ▲ {cause.up} ▼ {cause.down}
      </Text>
      <Field label="Title" value={title} onChangeText={setTitle} maxLength={120} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Switch value={pinned} onValueChange={setPinned} trackColor={{ true: brand.saffron }} />
        <P>Pin to the top</P>
      </View>
      <Button title={busy ? "Saving…" : "Save"} disabled={busy || (title.trim().length > 0 && title.trim().length < 5)} onPress={save} />
    </Card>
  );
}
