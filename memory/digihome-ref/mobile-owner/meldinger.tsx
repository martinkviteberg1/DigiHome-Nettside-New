import React from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react-native";
import { api } from "../../src/lib/api";
import { chatTime } from "../../src/lib/format";
import { fonts, oc } from "../../src/owner/theme";
import { OAvatar, Txt } from "../../src/owner/kit";

const CAT: Record<string, string> = {
  vedlikehold: "Vedlikehold", kontrakt: "Kontrakt", okonomi: "Økonomi", leietaker: "Leietaker", generelt: "Generelt",
};

function Chips({ value, onChange, chips }: { value: string; onChange: (k: string) => void; chips: { key: string; label: string }[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, maxHeight: 48 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 4 }}>
      {chips.map((c) => {
        const active = c.key === value;
        return (
          <Pressable
            key={c.key}
            testID={`owner-msg-filter-${c.key}`}
            onPress={() => onChange(c.key)}
            style={[styles.chip, active ? { backgroundColor: oc.accent, borderColor: oc.accent } : { backgroundColor: oc.card, borderColor: oc.border }]}
          >
            <Txt v="small" c={active ? oc.onAccent : oc.textSecondary} style={{ fontFamily: fonts.bodyMed }}>{c.label}</Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function OwnerMeldinger() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = React.useState("all");
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["owner-convos"],
    queryFn: async () => (await api.get("/api/portal/owner/conversations")).data?.data as any[],
    refetchInterval: 15000,
  });

  const items = data || [];
  const present = Array.from(new Set(items.map((c) => c.category).filter(Boolean))) as string[];
  const chips = [
    { key: "all", label: "Alle" },
    { key: "unread", label: "Uleste" },
    ...present.map((c) => ({ key: c, label: CAT[c] || c })),
  ];
  const filtered = items.filter((c) => {
    if (filter === "all") return true;
    if (filter === "unread") return (c.unread_count || 0) > 0;
    return c.category === filter;
  });

  return (
    <View style={{ flex: 1, backgroundColor: oc.bg, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <Txt v="label" c={oc.accent}>MELDINGER</Txt>
        <Txt v="h1" style={{ marginTop: 6 }}>Samtaler</Txt>
      </View>
      {items.length > 0 ? <Chips value={filter} onChange={setFilter} chips={chips} /> : null}
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 10 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={oc.accent} colors={[oc.accent]} />}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={{ alignItems: "center", paddingTop: 60, gap: 10 }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: oc.accentSoft, alignItems: "center", justifyContent: "center" }}>
                <MessageCircle size={22} color={oc.textMuted} strokeWidth={1.6} />
              </View>
              <Txt v="h3">Ingen samtaler</Txt>
              <Txt v="small">Meldinger med forvalteren din vises her.</Txt>
            </View>
          )
        }
        renderItem={({ item }) => {
          const title = item.subject || "Samtale";
          const unread = item.unread_count || 0;
          return (
            <Pressable testID={`convo-row-${item.id}`} onPress={() => router.push(`/(owner)/chat/${item.id}?title=${encodeURIComponent(title)}` as any)} style={({ pressed }) => [styles.row, pressed ? { backgroundColor: oc.pressed } : null]}>
              <OAvatar name={title} size={46} />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Txt v="h3" numberOfLines={1} style={{ flex: 1, fontSize: 15 }}>{title}</Txt>
                  <Txt v="small" c={oc.textMuted} style={{ fontSize: 11 }}>{chatTime(item.last_message_at)}</Txt>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <Txt v="small" numberOfLines={1} c={unread ? oc.text : oc.textSecondary} style={{ flex: 1 }}>{item.last_message || "Ny samtale"}</Txt>
                  {unread > 0 ? <View style={styles.unread}><Txt v="small" c={oc.onAccent} style={{ fontSize: 11 }}>{unread}</Txt></View> : null}
                </View>
                {item.category && CAT[item.category] ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 }}>
                    <View style={styles.catDot} />
                    <Txt v="small" c={oc.accent} style={{ fontSize: 11.5, fontFamily: fonts.bodyMed }}>{CAT[item.category]}</Txt>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: oc.card, borderWidth: 1, borderColor: oc.border },
  unread: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: oc.accent, alignItems: "center", justifyContent: "center" },
  catDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: oc.accent },
});
