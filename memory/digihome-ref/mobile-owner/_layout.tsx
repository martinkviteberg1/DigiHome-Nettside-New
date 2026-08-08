import React from "react";
import { Redirect, Tabs } from "expo-router";
import { Building2, LayoutGrid, MessageCircle, User } from "lucide-react-native";
import { useAuth } from "../../src/lib/auth";
import { Loading } from "../../src/components/ui";
import { glassTabScreenOptions } from "../../src/components/GlassTabBar";
import { useUnreadCount } from "../../src/lib/badges";

export default function OwnerLayout() {
  const { status, group } = useAuth();
  if (status === "loading") return <Loading />;
  if (status === "guest") return <Redirect href="/(auth)/login" />;
  if (group !== "owner") return <Redirect href="/" />;
  return <OwnerTabs />;
}

function OwnerTabs() {
  const unread = useUnreadCount("/api/portal/owner/conversations");
  return (
    <Tabs screenOptions={glassTabScreenOptions}>
      <Tabs.Screen name="index" options={{ title: "Oversikt", tabBarIcon: ({ color, size }) => <LayoutGrid size={size - 2} color={color} /> }} />
      <Tabs.Screen name="boliger" options={{ title: "Boliger", tabBarIcon: ({ color, size }) => <Building2 size={size - 2} color={color} /> }} />
      <Tabs.Screen name="meldinger" options={{ title: "Meldinger", tabBarIcon: ({ color, size }) => <MessageCircle size={size - 2} color={color} />, tabBarBadge: unread || undefined }} />
      <Tabs.Screen name="profil" options={{ title: "Profil", tabBarIcon: ({ color, size }) => <User size={size - 2} color={color} /> }} />
      <Tabs.Screen name="chat/[convoId]" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="bolig/[id]" options={{ href: null, tabBarStyle: { display: "none" } }} />
    </Tabs>
  );
}
