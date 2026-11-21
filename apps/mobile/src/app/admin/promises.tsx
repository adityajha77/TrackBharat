import { useState } from "react";
import { Alert, Text, View } from "react-native";
import type { AdminPromise } from "@trackbharat/shared";
import { Badge, Button, Card, Chip, Field, P, Screen, State, Title, useColors } from "@/components/ui";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/use-load";

const STATUSES = ["PENDING", "IN_PROGRESS", "PARTIAL", "FULFILLED", "STALLED", "BROKEN"];

/** PROMISES (verifiers and admins): new status for a report-card promise, always with a source. */
export default function Promises() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, error, loading, reload } = useLoad(() => api.adminPromises(search), [search]);
  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <Title eyebrow="Admin">Promises</Title>
      <Field label="Search promise or constituency" value={q} onChangeText={setQ} returnKeyType="search" onSubmitEditing={() => setSearch(q.trim())} />
      <State loading={loading && !data} error={error} empty={data && data.promises.length === 0 ? "No promises yet. They're added when a suggestion is approved." : false} onRetry={reload} />
      {data?.promises.map((p) => (
        <PromiseCard key={p.id} promise={p} onSaved={reload} />
      ))}
    </Screen>
  );
}

function PromiseCard({ promise: p, onSaved }: { promise: AdminPromise; onSaved: () => void }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(p.status);
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.promiseStatus(p.id, { status, note: note.trim(), source: { url: url.trim(), title: title.trim(), publisher: publisher.trim(), kind: "NEWS" } });
      setOpen(false);
      onSaved();
    } catch (e) {
      Alert.alert("Not saved", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <Text style={{ color: c.text, fontWeight: "800" }}>{p.title}</Text>
      <P muted>
        {p.madeBy ?? "Unknown"} · {p.constituency ? `${p.constituency.name}, ${p.constituency.state}` : "nationwide"}
      </P>
      <Badge label={p.status.replace("_", " ")} />
      {!open ? (
        <Button title="Change status" kind="secondary" onPress={() => setOpen(true)} />
      ) : (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {STATUSES.map((s) => (
              <Chip key={s} label={s.replace("_", " ").toLowerCase()} active={s === status} onPress={() => setStatus(s)} />
            ))}
          </View>
          <Field label="What changed" value={note} onChangeText={setNote} multiline />
          <Field label="Source link" value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" placeholder="https://…" />
          <Field label="Source title" value={title} onChangeText={setTitle} />
          <Field label="Publisher" value={publisher} onChangeText={setPublisher} placeholder="e.g. The Hindu" />
          <Button
            title={busy ? "Saving…" : "Save status"}
            disabled={busy || note.trim().length < 10 || !url.startsWith("http") || title.trim().length < 3 || publisher.trim().length < 2}
            onPress={save}
          />
        </View>
      )}
    </Card>
  );
}
