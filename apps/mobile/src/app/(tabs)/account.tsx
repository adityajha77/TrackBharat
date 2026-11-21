import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { Text } from "react-native";
import { Badge, brand, Button, Card, P, Screen, State, Title, useColors } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { WEB_URL } from "@/lib/config";
import { useLoad } from "@/lib/use-load";

/** ACCOUNT: log in, your activity, the admin panel for staff, log out. */
export default function Account() {
  const c = useColors();
  const { user, isStaff, logout } = useAuth();
  const activity = useLoad(() => (user ? api.activity() : Promise.resolve(null)), [user?.id]);

  if (!user)
    return (
      <Screen>
        <Title eyebrow="Account">Join TrackBharat</Title>
        <P muted>Log in to vote on causes, suggest stories and follow what your representatives do.</P>
        <Button title="Log in or sign up" onPress={() => router.push("/login")} />
        <Links />
      </Screen>
    );

  return (
    <Screen onRefresh={activity.reload} refreshing={activity.loading}>
      <Title eyebrow="Account">Namaste, {user.name.split(" ")[0]}</Title>
      <Card>
        <Badge label={user.role} color={user.role === "CITIZEN" ? undefined : brand.navy} />
        <P muted>{user.emailVerified ? "Email verified: your votes count." : "Confirm your email (check your inbox) so your votes count."}</P>
      </Card>

      {isStaff && (
        <Card onPress={() => router.push("/admin")} style={{ borderColor: brand.saffron }}>
          <Text style={{ color: c.text, fontWeight: "900", fontSize: 17 }}>Admin panel →</Text>
          <P muted>News desk, users and roles, causes, promises.</P>
        </Card>
      )}

      <Text style={{ color: c.text, fontWeight: "900", fontSize: 18 }}>My activity</Text>
      <State loading={activity.loading && !activity.data} error={activity.error} onRetry={activity.reload} />
      {activity.data && (
        <Card>
          <P>{activity.data.issues.length} problems reported</P>
          {activity.data.issues.slice(0, 5).map((i) => (
            <P key={i.id} muted>
              • {i.title} ({i.status.toLowerCase()})
            </P>
          ))}
        </Card>
      )}
      <Links />
      <Button title="Log out" kind="secondary" onPress={logout} />
    </Screen>
  );
}

function Links() {
  return (
    <Card>
      <P muted>Reporting a local problem with a photo, settings and the full site:</P>
      <Button title="Open track-bharat.vercel.app" kind="secondary" onPress={() => WebBrowser.openBrowserAsync(WEB_URL)} />
      <Button title="Privacy policy" kind="secondary" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/privacy`)} />
    </Card>
  );
}
