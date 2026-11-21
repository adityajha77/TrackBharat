import { NativeTabs } from "expo-router/native-tabs";
import { brand, useColors } from "@/components/ui";

/** The five main tabs (native tab bar on Android and iOS). */
export default function TabsLayout() {
  const c = useColors();
  return (
    <NativeTabs backgroundColor={c.surface} indicatorColor={brand.saffron} labelStyle={{ selected: { color: c.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="causes">
        <NativeTabs.Trigger.Label>Causes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="hand.thumbsup.fill" md="thumb_up" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="news">
        <NativeTabs.Trigger.Label>News</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="newspaper.fill" md="newspaper" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="parties">
        <NativeTabs.Trigger.Label>Manifestos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checklist" md="checklist" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
