import { router, type Href } from "expo-router";
import { Text, View } from "react-native";
import { brand, Card, P, Screen, State, Title, useColors } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/use-load";

/** ADMIN PANEL home: what's waiting, and the sections this role may use (the API checks again). */
export default function AdminHome() {
  const c = useColors();
  const { user } = useAuth();
  const { data, error, loading, reload } = useLoad(() => api.adminOverview(), []);
  const role = user?.role ?? "CITIZEN";
  const sections: { href: Href; title: string; body: string; roles: string[] }[] = [
    { href: "/admin/news", title: "News desk", body: "Publish citizen suggestions and press headlines with your summary.", roles: ["VERIFIER", "MODERATOR", "ADMIN"] },
    { href: "/admin/users", title: "Users & roles", body: "Make someone a verifier or moderator; block abusive accounts.", roles: ["ADMIN"] },
    { href: "/admin/causes", title: "Causes of the Week", body: "Reword or pin this week's causes.", roles: ["MODERATOR", "ADMIN"] },
    { href: "/admin/promises", title: "Promises", body: "Update a report-card promise's status, with a source.", roles: ["VERIFIER", "ADMIN"] },
  ];
  const stat = (label: string, n: number, urgent = false) => (
    <View style={{ flexBasis: "47%", flexGrow: 1 }}>
      <Card>
        <Text style={{ color: urgent && n > 0 ? brand.danger : c.text, fontSize: 26, fontWeight: "900" }}>{n}</Text>
        <P muted>{label}</P>
      </Card>
    </View>
  );
  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <Title eyebrow={`Admin · ${role}`}>Overview</Title>
      <State loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {stat("stories suggested", data.waiting.newsSuggestions, true)}
          {stat("promise suggestions", data.waiting.promiseSubmissions, true)}
          {stat("flagged reports", data.waiting.reportedIssues, true)}
          {stat("accounts", data.users.total)}
          {stat("joined this week", data.users.newThisWeek)}
          {stat("verified news", data.content.publishedNews)}
        </View>
      )}
      {sections
        .filter((s) => s.roles.includes(role))
        .map((s) => (
          <Card key={String(s.href)} onPress={() => router.push(s.href)}>
            <Text style={{ color: c.text, fontWeight: "900", fontSize: 17 }}>{s.title} →</Text>
            <P muted>{s.body}</P>
          </Card>
        ))}
      <P muted>Reported problems and promise suggestions are reviewed on the website&apos;s Moderation page. Every decision is recorded in the audit log.</P>
    </Screen>
  );
}
