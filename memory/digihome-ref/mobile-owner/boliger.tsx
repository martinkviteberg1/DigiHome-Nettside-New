import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react-native";
import { api } from "../../src/lib/api";
import { mediaUrl } from "../../src/lib/format";
import { oc } from "../../src/owner/theme";
import { BuildingCard, Card, OwnerScreen, Reveal, Txt } from "../../src/owner/kit";

const VACANT = new Set(["published", "scheduled", "draft"]);

export default function Boliger() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["owner-bootstrap"],
    queryFn: async () => (await api.get("/api/portal/bootstrap")).data?.data,
  });

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: oc.bg, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={oc.accent} /></View>;
  }
  const units: any[] = data?.units || [];

  return (
    <OwnerScreen refreshing={isRefetching} onRefresh={refetch} testID="owner-boliger">
      <Txt v="label" c={oc.accent}>BOLIGER</Txt>
      <Txt v="h1" style={{ marginTop: 6, marginBottom: 24 }}>{units.length === 1 ? "Min bolig" : "Mine boliger"}</Txt>
      {units.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: 32 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: oc.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Building2 size={24} color={oc.textMuted} strokeWidth={1.5} />
          </View>
          <Txt v="h3">Ingen boliger</Txt>
          <Txt v="small" style={{ marginTop: 4 }}>Boligene dine vises her når de er registrert.</Txt>
        </Card>
      ) : (
        <View style={{ gap: 14 }}>
          {units.map((u, i) => {
            const vacant = VACANT.has(u.rental_listing?.status || "");
            return (
              <Reveal key={u.id} delay={i * 50}>
                <BuildingCard
                  testID={`owner-unit-${u.id}`}
                  cover={mediaUrl(u.photo_thumb)}
                  title={u.listing_title || u.name || u.address || "Bolig"}
                  subtitle={u.address || u.rental_listing?.title}
                  statusLabel={vacant ? "Til utleie" : "Utleid"}
                  statusTone={vacant ? "vacant" : "occupied"}
                  rent={u.monthly_rent || undefined}
                  onPress={() => router.push(`/(owner)/bolig/${u.id}` as any)}
                />
              </Reveal>
            );
          })}
        </View>
      )}
    </OwnerScreen>
  );
}
