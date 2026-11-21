import { useState } from "react";
import { Alert, Text, View } from "react-native";
import type { AdminUser } from "@trackbharat/shared";
import { Badge, brand, Button, Card, Chip, Field, P, Screen, State, Title, useColors } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/use-load";

const ROLES = ["CITIZEN", "VERIFIER", "MODERATOR", "ADMIN"] as const;

/** USERS & ROLES (admins only): search, change role, block or unblock, with a reason. */
export default function Users() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, error, loading, reload } = useLoad(() => api.adminUsers(search), [search]);
  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <Title eyebrow="Admin">Users & roles</Title>
      <Field label="Search name or email" value={q} onChangeText={setQ} autoCapitalize="none" returnKeyType="search" onSubmitEditing={() => setSearch(q.trim())} />
      <State loading={loading && !data} error={error} empty={data && data.users.length === 0 ? "No accounts match." : false} onRetry={reload} />
      {data && <P muted>{data.total} accounts</P>}
      {data?.users.map((u) => (
        <UserCard key={u.id} user={u} onSaved={reload} />
      ))}
    </Screen>
  );
}

function UserCard({ user: u, onSaved }: { user: AdminUser; onSaved: () => void }) {
  const c = useColors();
  const { user: me } = useAuth();
  const [role, setRole] = useState<string>(u.role);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (change: { role?: string; blocked?: boolean }) => {
    setBusy(true);
    try {
      await api.updateUser(u.id, { ...change, note: note.trim() });
      setNote("");
      onSaved();
    } catch (e) {
      Alert.alert("Not saved", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={u.isBlocked ? { opacity: 0.75 } : undefined}>
      <Text style={{ color: c.text, fontWeight: "800" }}>{u.name}</Text>
      <P muted>{u.email}</P>
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        <Badge label={u.role} />
        {u.isBlocked && <Badge label="blocked" color={brand.danger} />}
        {u.googleLinked && <Badge label="google" />}
      </View>
      {me?.id === u.id ? (
        <P muted>This is you.</P>
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {ROLES.map((r) => (
              <Chip key={r} label={r.toLowerCase()} active={r === role} onPress={() => setRole(r)} />
            ))}
          </View>
          <Field label="Reason (for the audit log)" value={note} onChangeText={setNote} placeholder="e.g. Helps verify news" />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button title="Save role" disabled={busy || role === u.role || note.trim().length < 5} onPress={() => save({ role })} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title={u.isBlocked ? "Unblock" : "Block"} kind={u.isBlocked ? "secondary" : "danger"} disabled={busy || note.trim().length < 5} onPress={() => save({ blocked: !u.isBlocked })} />
            </View>
          </View>
        </>
      )}
    </Card>
  );
}
