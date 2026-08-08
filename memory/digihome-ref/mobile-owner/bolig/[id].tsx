import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { ArrowLeft } from "lucide-react-native";
import { api } from "../../../src/lib/api";
import { mediaUrl, money } from "../../../src/lib/format";
import { fonts, oc } from "../../../src/owner/theme";
import { Card, Txt } from "../../../src/owner/kit";

const FURN: Record<string, string> = { furnished: "Møblert", unfurnished: "Umøblert", partial: "Delvis møblert" };
const STATUS: Record<string, { label: string; c: string; bg: string }> = {
  occupied: { label: "Utleid", c: oc.successInk, bg: oc.successSoft },
  available: { label: "Ledig", c: oc.warnInk, bg: oc.warnSoft },
  maintenance: { label: "Vedlikehold", c: oc.textSecondary, bg: oc.divider },
};

function firstPhoto(u: any) {
  const p = u?.photos?.[0] ?? u?.photo_thumbs?.[0];
  return mediaUrl(typeof p === "string" ? p : p?.url);
}

function InfoRow({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <View style={[styles.info, last ? { borderBottomWidth: 0 } : null]}>
      <Txt v="small">{label}</Txt>
      {typeof value === "string" || typeof value === "number" ? <Txt v="bodyMed">{value}</Txt> : value}
    </View>
  );
}

export default function BoligDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: unit, isLoading } = useQuery({
    queryKey: ["unit", id],
    queryFn: async () => {
      const r = (await api.get(`/api/units/${id}`)).data;
      return r?.data || r;
    },
  });

  const title = unit?.listing_title || unit?.name || unit?.address || "Bolig";
  const st = unit ? STATUS[unit.status] : null;
  const photo = unit ? firstPhoto(unit) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: oc.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="bolig-back" onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <ArrowLeft size={22} color={oc.text} />
        </Pressable>
        <Txt v="h3" numberOfLines={1} style={{ flex: 1 }}>{isLoading ? "" : title}</Txt>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={oc.accent} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {photo ? <Image source={{ uri: photo }} style={{ width: "100%", height: 200, borderRadius: 20, backgroundColor: oc.divider, marginBottom: 16 }} contentFit="cover" transition={150} /> : null}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <Txt v="h1" style={{ flex: 1 }}>{title}</Txt>
            {st ? <View style={{ backgroundColor: st.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}><Txt v="small" c={st.c} style={{ fontFamily: fonts.bodyMed }}>{st.label}</Txt></View> : null}
          </View>
          {unit?.address ? <Txt v="small" style={{ marginTop: 4 }}>{unit.address}</Txt> : null}

          <Card style={{ marginTop: 22, paddingVertical: 4 }}>
            <InfoRow label="Månedsleie" value={money(unit?.monthly_rent)} />
            <InfoRow label="Depositum" value={money(unit?.deposit)} />
            <InfoRow label="Soverom" value={unit?.bedrooms != null ? String(unit.bedrooms) : "–"} />
            <InfoRow label="Areal" value={unit?.sqm ? `${unit.sqm} m²` : "–"} />
            <InfoRow label="Etasje" value={unit?.floor != null ? String(unit.floor) : "–"} />
            <InfoRow label="Møblering" value={FURN[unit?.furnishing] || "–"} last />
          </Card>

          <Card style={{ marginTop: 14, paddingVertical: 4 }}>
            <InfoRow label="Forvaltningshonorar" value={unit?.mgmt_fee_percent != null ? `${unit.mgmt_fee_percent} %` : "–"} />
            <InfoRow label="Utleiemodell" value={unit?.rental_model || unit?.rental_mode || "–"} last />
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: oc.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: oc.border },
  back: { width: 32, height: 36, alignItems: "flex-start", justifyContent: "center" },
  info: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: oc.divider, gap: 12 },
});
