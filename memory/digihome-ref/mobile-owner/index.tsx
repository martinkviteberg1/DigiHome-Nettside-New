import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, CheckCircle2, Mail, MessageSquare, Phone, Sparkles, User as UserIcon, Wrench,
} from "lucide-react-native";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { avatarSource, mediaUrl } from "../../src/lib/format";
import { useUnreadCount } from "../../src/lib/badges";
import { greetingFor, nok, oc } from "../../src/owner/theme";
import {
  ActionTile, AttentionRow, BuildingCard, Card, IncomeHero, OAvatar,
  OwnerHeader, OwnerScreen, Reveal, SectionTitle, StatCard, Txt,
} from "../../src/owner/kit";
import { OnboardingChecklist } from "../../src/owner/OnboardingChecklist";

const OPEN = new Set(["open", "in_progress", "triaged"]);
const VACANT = new Set(["published", "scheduled", "draft"]);

function Loading() {
  return (
    <View style={{ flex: 1, backgroundColor: oc.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={oc.accent} />
    </View>
  );
}

function ManagerCard({ manager, onContact }: any) {
  return (
    <Card style={{ marginTop: 24 }}>
      <Txt v="label" style={{ marginBottom: 14 }}>Din forvalter</Txt>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <OAvatar uri={mediaUrl(manager.avatar)} name={manager.name} size={46} dark />
        <View style={{ flex: 1 }}>
          <Txt v="h3">{manager.name}</Txt>
          <Txt v="small">Ansvarlig forvalter</Txt>
        </View>
      </View>
      {manager.email ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Mail size={14} color={oc.textMuted} strokeWidth={1.6} /><Txt v="small">{manager.email}</Txt>
        </View>
      ) : null}
      {manager.phone ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Phone size={14} color={oc.textMuted} strokeWidth={1.6} /><Txt v="small">{manager.phone}</Txt>
        </View>
      ) : null}
      <Pressable testID="contact-manager-btn" onPress={onContact} style={({ pressed }) => [{ marginTop: 4, backgroundColor: oc.accent, borderRadius: 14, paddingVertical: 13, alignItems: "center" }, pressed ? { opacity: 0.85 } : null]}>
        <Txt v="bodyMed" c={oc.onAccent}>Kontakt forvalter</Txt>
      </Pressable>
    </Card>
  );
}

export default function Oversikt() {
  const router = useRouter();
  const { user } = useAuth();
  const unread = useUnreadCount("/api/portal/owner/conversations");

  const dash = useQuery({
    queryKey: ["owner-dashboard"],
    queryFn: async () => (await api.get("/api/portal/owner/dashboard")).data?.data,
  });
  const boot = useQuery({
    queryKey: ["owner-bootstrap"],
    queryFn: async () => (await api.get("/api/portal/bootstrap")).data?.data,
  });

  if (dash.isLoading) return <Loading />;

  const data = dash.data || {};
  const kpis = data.kpis || {};
  const units: any[] = boot.data?.units || [];
  const cases: any[] = data.recent_cases || [];
  const openCases = cases.filter((c) => OPEN.has(c.status));
  const manager = data.manager;

  const firstName = (data.owner?.name || user?.name || "Huseier").split(" ")[0];
  const occ = kpis.occupied || 0;
  const rentable = kpis.total_rentable || 0;

  const bits: string[] = [];
  if (kpis.monthly_income > 0) bits.push(`Tjener ${nok(kpis.monthly_income)} kr/mnd`);
  bits.push(`${occ} av ${rentable} ${rentable === 1 ? "enhet" : "enheter"} utleid`);
  if (openCases.length) bits.push(`${openCases.length} ${openCases.length === 1 ? "sak" : "saker"} venter`);
  const summary = bits.join(" · ");

  const refresh = () => { dash.refetch(); boot.refetch(); };
  const refreshing = dash.isRefetching || boot.isRefetching;

  return (
    <OwnerScreen refreshing={refreshing} onRefresh={refresh} testID="owner-oversikt">
      <OwnerHeader
        greeting={greetingFor()}
        name={firstName}
        summary={summary}
        avatarUri={avatarSource(user, 38)}
        onProfile={() => router.push("/(owner)/profil" as any)}
      />

      <Reveal delay={60}><OnboardingChecklist /></Reveal>

      <Reveal delay={90}><IncomeHero monthly={kpis.monthly_income || 0} annual={kpis.annual_estimate || 0} /></Reveal>

      <Reveal delay={120}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
          <StatCard testID="kpi-occupancy" label="Belegg" value={`${kpis.occupancy_pct || 0}%`} sub={`${occ} av ${rentable}`} ring={kpis.occupancy_pct || 0} />
          <StatCard testID="kpi-properties" label="Boliger" value={kpis.total_properties || 0} onPress={() => router.push("/(owner)/boliger" as any)} />
          <StatCard testID="kpi-active-leases" label="Kontrakter" value={kpis.active_leases || 0} sub={kpis.active_leases ? "aktive" : "ingen"} />
          <StatCard testID="kpi-open-cases" label="Åpne saker" value={kpis.open_cases || 0} alert={(kpis.open_cases || 0) > 0} sub={(kpis.open_cases || 0) > 0 ? "følg opp" : "alt løst"} />
        </View>
      </Reveal>

      <Reveal delay={150} style={{ marginTop: 32 }}>
        <SectionTitle title="Hva vil du gjøre nå?" />
        <View style={{ gap: 12 }}>
          <ActionTile testID="owner-action-boliger" icon={Building2} title="Boligene mine" desc="Se status, leie og detaljer." onPress={() => router.push("/(owner)/boliger" as any)} />
          <ActionTile testID="owner-action-message" icon={MessageSquare} title="Send melding" desc="Kontakt forvalteren din." onPress={() => router.push("/(owner)/meldinger" as any)} />
          <ActionTile testID="owner-action-profil" icon={UserIcon} title="Min profil" desc="Konto, personvern og innstillinger." onPress={() => router.push("/(owner)/profil" as any)} />
        </View>
      </Reveal>

      <Reveal delay={180} style={{ marginTop: 32 }}>
        <SectionTitle title="Trenger din oppmerksomhet" />
        <View style={{ gap: 12 }} testID="attention-feed">
          {openCases.length > 0 ? (
            <AttentionRow
              testID="attention-cases"
              icon={Wrench}
              tone="danger"
              eyebrow="Vedlikehold"
              title={`${openCases.length} ${openCases.length === 1 ? "sak" : "saker"} venter på oppfølging`}
              sub={openCases.slice(0, 2).map((c) => c.title).filter(Boolean).join(" · ")}
            />
          ) : (
            <Card style={{ alignItems: "center", paddingVertical: 28 }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: oc.successSoft, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <CheckCircle2 size={24} color={oc.successInk} strokeWidth={1.7} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Txt v="h3">Alt er i skjønneste orden</Txt>
                <Sparkles size={15} color={oc.warnInk} />
              </View>
              <Txt v="small" style={{ marginTop: 4 }}>Ingenting krever handling akkurat nå.</Txt>
            </Card>
          )}
        </View>
      </Reveal>

      <Reveal delay={210} style={{ marginTop: 32 }}>
        <SectionTitle
          title={units.length === 1 ? "Min bolig" : "Mine boliger"}
          right={units.length > 3 ? <Txt v="small" c={oc.accent} onPress={() => router.push("/(owner)/boliger" as any)}>Se alle</Txt> : undefined}
        />
        {units.length === 0 ? (
          <Card style={{ alignItems: "center", paddingVertical: 28 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: oc.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <Building2 size={24} color={oc.textMuted} strokeWidth={1.5} />
            </View>
            <Txt v="h3">Ingen boliger ennå</Txt>
            <Txt v="small" style={{ marginTop: 4 }}>Boligene dine vises her.</Txt>
          </Card>
        ) : (
          <View style={{ gap: 14 }}>
            {units.slice(0, 4).map((u) => {
              const vacant = VACANT.has(u.rental_listing?.status || "");
              return (
                <BuildingCard
                  key={u.id}
                  testID={`owner-unit-${u.id}`}
                  cover={mediaUrl(u.photo_thumb)}
                  title={u.listing_title || u.name || u.address || "Bolig"}
                  subtitle={u.address || u.rental_listing?.title}
                  statusLabel={vacant ? "Til utleie" : "Utleid"}
                  statusTone={vacant ? "vacant" : "occupied"}
                  rent={u.monthly_rent || undefined}
                  onPress={() => router.push(`/(owner)/bolig/${u.id}` as any)}
                />
              );
            })}
          </View>
        )}
      </Reveal>

      {manager ? (
        <Reveal delay={240}>
          <ManagerCard manager={manager} onContact={() => router.push("/(owner)/meldinger" as any)} />
        </Reveal>
      ) : null}

      <Reveal delay={270} style={{ marginTop: 24 }}>
        <ActionTile
          testID="owner-go-messages"
          icon={MessageSquare}
          title={unread > 0 ? `Meldinger · ${unread} uleste` : "Meldinger"}
          desc="Snakk med forvalteren din."
          onPress={() => router.push("/(owner)/meldinger" as any)}
        />
      </Reveal>
    </OwnerScreen>
  );
}
