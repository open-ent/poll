export interface ShareAction {
  name: string[];
  displayName: string;
  type: string;
}

export interface Visible {
  id: string;
  /** personnes */
  username?: string;
  profile?: string;
  /** groupes */
  name?: string;
}

export interface ShareData {
  actions: ShareAction[];
  users: { visibles: Visible[]; checked: Record<string, string[]> };
  groups: { visibles: Visible[]; checked: Record<string, string[]> };
}

/** Niveaux de partage, du plus faible au plus fort : lire, répondre, gérer. Chacun inclut les précédents. */
export const LEVELS = ["poll.read", "poll.contrib", "poll.manager"] as const;
export type Level = (typeof LEVELS)[number];

/** Noms de droits d'un niveau et de tous ceux qui le précèdent. */
export const namesUpTo = (actions: ShareAction[], level: Level): string[] => {
  const upTo = LEVELS.slice(0, LEVELS.indexOf(level) + 1);
  return actions
    .filter((a) => (upTo as readonly string[]).includes(a.displayName))
    .flatMap((a) => a.name);
};

const namesOf = (actions: ShareAction[], level: Level): string[] =>
  actions.find((a) => a.displayName === level)?.name ?? [];

/** Plus haut niveau entièrement accordé par une liste de droits, ou `null` si aucun. */
export const levelOf = (
  actions: ShareAction[],
  checked: string[] | undefined,
): Level | null => {
  const has = new Set(checked ?? []);
  let found: Level | null = null;
  for (const l of LEVELS) {
    const names = namesOf(actions, l);
    if (names.length > 0 && names.every((n) => has.has(n))) found = l;
  }
  return found;
};

/** Coche un niveau (avec ceux qu'il inclut), ou le décoche (avec ceux qui l'incluent) : cocher « gérer » coche « répondre » et « lire ». */
export const toggleLevel = (
  actions: ShareAction[],
  checked: string[] | undefined,
  level: Level,
): string[] => {
  const current = levelOf(actions, checked);
  const idx = LEVELS.indexOf(level);
  const target: Level | null =
    current && LEVELS.indexOf(current) >= idx
      ? idx === 0
        ? null
        : LEVELS[idx - 1]
      : level;
  return target ? namesUpTo(actions, target) : [];
};

/** Corps de l'enregistrement : les droits de chaque personne et de chaque groupe ; une entrée sans droit disparaît. */
export const shareBody = (
  users: Record<string, string[]>,
  groups: Record<string, string[]>,
) => {
  const clean = (m: Record<string, string[]>) =>
    Object.fromEntries(Object.entries(m).filter(([, v]) => v.length > 0));
  return { users: clean(users), groups: clean(groups) };
};

/** Recherche dans la liste des destinataires possibles (nom, sans tenir compte de la casse ni des accents). */
export const filterVisibles = (list: Visible[], query: string): Visible[] => {
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const q = norm(query.trim());
  return q
    ? list.filter((v) => norm(v.username ?? v.name ?? "").includes(q))
    : list;
};
