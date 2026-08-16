// ═══════════════════ Tilgangsstyring for saker ═══════════════════
// Bransjestandard lagdelt modell (Linear/Jira-mønster):
//   Lag 1: Modultilgang (kan du se Saker i det hele tatt) — håndteres av auth.
//   Lag 2: OMRÅDER (spaces) med gruppebasert tilgang — saken «bor» et sted,
//          og stedet avgjør hvem som ser den. Deny-by-default for nye brukere.
//   Lag 3: Per-sak-begrensning (restrictedTo) — unntaksventil for enkeltsaker.
// Prinsipper: minste privilegium, håndheving på serveren (liste, søk, varsler,
// e-post, påminnelser), admin/eier ser alltid alt, endringer logges.
// Delt mellom API-ruteren og påminnelses-cronen så reglene aldri divergerer.

export const SAK_GRUPPER = ['styret', 'ledelsen', 'utvikling'];
export const SAK_GRUPPE_LABEL = { styret: 'Styret', ledelsen: 'Ledelsen', utvikling: 'Utvikling' };

export const SAK_OMRAADER = ['drift', 'styret', 'ledelse', 'utvikling'];
export const SAK_OMRAADE_LABEL = { drift: 'Drift', styret: 'Styret', ledelse: 'Ledelse', utvikling: 'Utvikling' };

// Hvilken gruppe kreves for å se et område (null = åpent for alle med sakstilgang).
export const OMRAADE_KREVER_GRUPPE = { drift: null, styret: 'styret', ledelse: 'ledelsen', utvikling: 'utvikling' };

// Admin-roller ser alt. Kontoer uten role-felt er historisk admin.
// NB: 'investor' er eksplisitt IKKE sak-admin — investorkontoer skal aldri
// implisitt se interne saker/filer selv om de gis enkeltmoduler.
export function erSakAdmin(role) {
  return !['bruker', 'partner', 'eier', 'investor'].includes(role || 'admin');
}

// Normaliser en viewer: { admin: bool, id: string|null, groups: string[] }
export function viewerFraMedlem(member) {
  if (!member) return { admin: false, id: null, groups: [] };
  return {
    admin: erSakAdmin(member.role),
    id: member.id || null,
    groups: Array.isArray(member.groups) ? member.groups.filter((g) => SAK_GRUPPER.includes(g)) : [],
  };
}

// Hvilke områder kan denne vieweren se?
export function omraaderForViewer(viewer) {
  if (!viewer) return ['drift'];
  return SAK_OMRAADER.filter((o) => {
    const krav = OMRAADE_KREVER_GRUPPE[o];
    return viewer.admin || !krav || viewer.groups.includes(krav);
  });
}

// Kan vieweren se saken? Området (gruppekrav) sjekkes FØRST — deretter
// per-sak-begrensning. Ansvarlig/følgere har ikke implisitt tilgang utenfor
// sitt område: minste privilegium vinner alltid.
export function sakSynlig(viewer, task) {
  if (!viewer) return false;
  if (viewer.admin) return true;
  const omr = SAK_OMRAADER.includes(task && task.space) ? task.space : 'drift';
  const krav = OMRAADE_KREVER_GRUPPE[omr];
  if (krav && !viewer.groups.includes(krav)) return false;
  if (task && Array.isArray(task.restrictedTo) && task.restrictedTo.length) {
    return !!viewer.id && task.restrictedTo.includes(viewer.id);
  }
  return true;
}

// Snarvei for person-dokumenter fra admin_users (varsler/e-post/påminnelser).
export function sakSynligForMedlem(member, task) {
  return sakSynlig(viewerFraMedlem(member), task);
}
