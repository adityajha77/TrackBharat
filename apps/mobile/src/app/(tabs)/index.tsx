import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { brand, Button, Card, Field, P, Screen, Title, useColors } from "@/components/ui";

/** HOME: the motto, and the one thing to do first: enter your PIN code. */
export default function Home() {
  const c = useColors();
  const [pin, setPin] = useState("");
  const valid = /^[1-9]\d{5}$/.test(pin);
  return (
    <Screen>
      <View style={{ flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden" }}>
        <View style={{ flex: 1, backgroundColor: brand.saffron }} />
        <View style={{ flex: 1, backgroundColor: "#fff" }} />
        <View style={{ flex: 1, backgroundColor: brand.green }} />
      </View>
      <Title eyebrow="TrackBharat">Vote with facts, not faces.</Title>
      <P muted>Find your MP and MLA, see what they promised and what they did, and raise the problems in your area.</P>

      <Card>
        <Field
          label="Your PIN code"
          value={pin}
          onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          placeholder="e.g. 744101"
          maxLength={6}
          returnKeyType="search"
          onSubmitEditing={() => valid && router.push(`/area/${pin}`)}
        />
        {pin.length === 6 && !valid && <P style={{ color: brand.danger }}>An Indian PIN code has 6 digits and cannot start with 0.</P>}
        <Button title="Find my representatives" disabled={!valid} onPress={() => router.push(`/area/${pin}`)} />
      </Card>

      <Card>
        <Text style={{ color: c.text, fontWeight: "900", fontSize: 16 }}>What you can do here</Text>
        <P>① See your MP&apos;s and MLA&apos;s promises and report card.</P>
        <P>② Vote on India&apos;s Causes of the Week.</P>
        <P>③ Read news that needs a voice, with sources.</P>
        <P>④ Compare what every party promised with what got done.</P>
      </Card>

      <Card style={{ backgroundColor: "#111" }}>
        <Text style={{ color: "#F6F2E8", fontSize: 17, fontWeight: "800" }}>
          &ldquo;We are not from any party or any religion. Our only motto is transparency.&rdquo;
        </Text>
      </Card>
    </Screen>
  );
}
