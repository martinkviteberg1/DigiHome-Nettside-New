import React, { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import {
  Building2, Check, ChevronRight, FileText, Home, KeyRound, LifeBuoy, LogOut, Mail, Phone, ScrollText, ShieldCheck, Trash2,
} from "lucide-react-native";
import { useAuth, RoleGroup } from "../../src/lib/auth";
import { api } from "../../src/lib/api";
import { apiError, avatarSource } from "../../src/lib/format";
import { fonts, oc } from "../../src/owner/theme";
import { Card, OAvatar, OwnerScreen, Txt } from "../../src/owner/kit";

const ROLE_LABEL: Record<string, string> = { superadmin: "Forvalter", admin: "Forvalter", owner: "Huseier", tenant: "Leietaker" };
const PRIVACY_URL = "https://digihome.no/personvern";
const TERMS_URL = "https://digihome.no/vilkar";
const SUPPORT_EMAIL = "support@digihome.no";

const VIEW_OPTIONS: { g: RoleGroup; label: string; icon: any; desc: string }[] = [
  { g: "forvalter", label: "Forvalter", icon: Building2, desc: "Administrer boliger og kunder" },
  { g: "owner", label: "Huseier", icon: Home, desc: "Dine egne boliger og inntekter" },
  { g: "tenant", label: "Leietaker", icon: KeyRound, desc: "Min bolig og husleie" },
];

function LinkRow({ icon: Icon, label, onPress, danger, last, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.link, last ? { borderBottomWidth: 0 } : null, pressed ? { opacity: 0.6 } : null]}>
      <Icon size={17} color={danger ? oc.dangerInk : oc.textMuted} strokeWidth={1.9} />
      <Txt v="bodyMed" style={{ flex: 1 }} c={danger ? oc.dangerInk : oc.text}>{label}</Txt>
      {!danger ? <ChevronRight size={16} color={oc.textMuted} /> : null}
    </Pressable>
  );
}

export default function OwnerProfil() {
  const { user, logout, canSwitchRole, group, switchGroup } = useAuth();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [switching, setSwitching] = useState(false);
  if (!user) return null;
  const avatar = avatarSource(user, 88);

  const onSwitch = async (g: RoleGroup) => {
    if (g === group || switching) return;
    setSwitching(true);
    await switchGroup(g);
    router.replace("/");
  };

  const requestDeletion = () => {
    Alert.alert(
      "Slett konto",
      "Vi registrerer en forespørsel om sletting av kontoen din og tilhørende personopplysninger. Du logges ut, og vi bekrefter når slettingen er fullført.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Be om sletting",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await api.post("/api/account/deletion-request", {});
              Alert.alert("Forespørsel mottatt", "Vi har registrert forespørselen din. Kontoen og dataene dine slettes, og du får en bekreftelse på e-post.", [{ text: "OK", onPress: () => logout() }]);
            } catch (e) {
              Alert.alert("Noe gikk galt", apiError(e));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <OwnerScreen testID="owner-profil">
      <Txt v="label" c={oc.accent}>PROFIL</Txt>
      <View style={{ alignItems: "center", marginTop: 24, marginBottom: 28 }}>
        <OAvatar uri={avatar} name={user.name} size={88} dark />
        <Txt v="h1" style={{ marginTop: 14 }}>{user.name}</Txt>
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: oc.accentSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 }}>
          <ShieldCheck size={13} color={oc.accent} />
          <Txt v="small" c={oc.accent} style={{ fontFamily: fonts.bodyMed }}>{ROLE_LABEL[user.role] || "Bruker"}</Txt>
        </View>
      </View>

      <Card style={{ padding: 0, paddingHorizontal: 18 }}>
        <View style={styles.info}>
          <Txt v="small">E-post</Txt>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Mail size={14} color={oc.textMuted} /><Txt v="bodyMed">{user.email}</Txt></View>
        </View>
        <View style={[styles.info, { borderBottomWidth: 0 }]}>
          <Txt v="small">Telefon</Txt>
          {user.phone ? <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Phone size={14} color={oc.textMuted} /><Txt v="bodyMed">{user.phone}</Txt></View> : <Txt v="bodyMed">–</Txt>}
        </View>
      </Card>

      {canSwitchRole ? (
        <>
          <Txt v="label" style={{ marginTop: 28, marginBottom: 8, marginLeft: 4 }}>BYTT VISNING</Txt>
          <Card style={{ padding: 0, paddingHorizontal: 18 }}>
            {VIEW_OPTIONS.map((opt, i) => {
              const active = group === opt.g;
              const Icon = opt.icon;
              return (
                <Pressable key={opt.g} testID={`switch-view-${opt.g}`} disabled={switching} onPress={() => onSwitch(opt.g)} style={({ pressed }) => [styles.link, i === VIEW_OPTIONS.length - 1 ? { borderBottomWidth: 0 } : null, pressed ? { opacity: 0.6 } : null]}>
                  <Icon size={18} color={active ? oc.accent : oc.textMuted} strokeWidth={1.9} />
                  <View style={{ flex: 1 }}>
                    <Txt v="bodyMed" c={active ? oc.accent : oc.text}>{opt.label}</Txt>
                    <Txt v="small">{opt.desc}</Txt>
                  </View>
                  {active ? <Check size={18} color={oc.accent} /> : null}
                </Pressable>
              );
            })}
          </Card>
          <Txt v="small" style={{ marginTop: 8, marginLeft: 4 }}>Kun for administratorer. Bytt mellom opplevelsene for forvalter, huseier og leietaker.</Txt>
        </>
      ) : null}

      <Txt v="label" style={{ marginTop: 28, marginBottom: 8, marginLeft: 4 }}>JURIDISK & SUPPORT</Txt>
      <Card style={{ padding: 0, paddingHorizontal: 18 }}>
        <LinkRow testID="profile-privacy" icon={ShieldCheck} label="Personvern" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} />
        <LinkRow testID="profile-terms" icon={ScrollText} label="Vilkår" onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} />
        <LinkRow testID="profile-support" icon={LifeBuoy} label="Kontakt support" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
        <LinkRow testID="profile-delete-account" icon={deleting ? FileText : Trash2} label={deleting ? "Sender forespørsel…" : "Slett konto"} danger last onPress={requestDeletion} />
      </Card>

      <Pressable testID="logout-btn" onPress={logout} style={({ pressed }) => [styles.logout, pressed ? { opacity: 0.8 } : null]}>
        <LogOut size={17} color={oc.dangerInk} />
        <Txt v="bodyMed" c={oc.dangerInk}>Logg ut</Txt>
      </Pressable>
      <Txt v="small" c={oc.textMuted} style={{ textAlign: "center", marginTop: 24 }}>DigiHome · v1.0</Txt>
    </OwnerScreen>
  );
}

const styles = StyleSheet.create({
  info: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: oc.divider, gap: 12 },
  link: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: oc.divider },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 32, minHeight: 52, borderRadius: 999, backgroundColor: oc.dangerSoft },
});
