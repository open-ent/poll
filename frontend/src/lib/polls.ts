export interface Answer {
  value?: string;
  votes?: string[];
}

export interface Poll {
  _id?: string;
  icon?: string;
  question: string;
  /** Date de fin : chaîne ISO, ou `{ $date }` selon la sérialisation Mongo. */
  end: string | { $date: string | number };
  answers: Answer[];
  owner?: { userId: string; displayName: string };
  myRights?: { read?: boolean; contrib?: boolean; manage?: boolean };
  /** Partages : une entrée par utilisateur (`userId`) ou groupe (`groupId`), avec les droits accordés. */
  shared?: Array<Record<string, unknown>>;
}

export const MAX_ANSWER = 75;

/** Date de fin d'un sondage, quelle que soit la forme reçue. */
export const endDate = (p: Pick<Poll, "end">): Date =>
  new Date(
    typeof p.end === "object" && p.end ? p.end.$date : (p.end as string),
  );

export const hasExpired = (p: Poll, now: Date = new Date()): boolean =>
  now.getTime() > endDate(p).getTime();

export const totalVotes = (p: Poll): number =>
  (p.answers ?? []).reduce((n, a) => n + (a.votes?.length ?? 0), 0);

export const hasAlreadyVoted = (p: Poll, userId: string): boolean =>
  (p.answers ?? []).some((a) => (a.votes ?? []).includes(userId));

/** On répond tant que l'on n'a pas voté, que le sondage n'est pas terminé et que l'on a le droit de répondre. */
export const canVote = (
  p: Poll,
  userId: string,
  now: Date = new Date(),
): boolean =>
  !hasAlreadyVoted(p, userId) &&
  !hasExpired(p, now) &&
  p.myRights?.contrib === true;

/** Pourcentage de votes d'une réponse (0 sans aucun vote), arrondi à l'entier. */
export const percent = (a: Answer, total: number): number =>
  total > 0 ? Math.round(((a.votes?.length ?? 0) / total) * 100) : 0;

export interface Sorted {
  /** à répondre : partagés avec moi, en cours, pas encore votés */
  unanswered: Poll[];
  /** les miens */
  submitted: Poll[];
  /** terminés ou déjà répondus (partagés avec moi) */
  finished: Poll[];
}

/** Classement de l'écran d'accueil, identique à l'ancienne interface. */
export const sortPolls = (
  polls: Poll[],
  userId: string,
  now: Date = new Date(),
): Sorted => {
  const out: Sorted = { unanswered: [], submitted: [], finished: [] };
  polls.forEach((p) => {
    const mine = p.owner?.userId === userId;
    // un sondage terminé, même lancé par moi, passe dans « terminés »
    if (mine && !hasExpired(p, now)) out.submitted.push(p);
    else if (mine || hasExpired(p, now) || hasAlreadyVoted(p, userId))
      out.finished.push(p);
    else out.unanswered.push(p);
  });
  return out;
};

export type DraftProblem = "question" | "answers" | null;

/** Un sondage a une question et au moins deux réponses renseignées. */
export const draftProblem = (
  question: string,
  answers: Answer[],
): DraftProblem => {
  if (!question.trim()) return "question";
  return answers.filter((a) => (a.value ?? "").trim()).length >= 2
    ? null
    : "answers";
};

export const removeAnswer = (answers: Answer[], index: number): Answer[] =>
  answers.length <= 2 || index < 0 || index >= answers.length
    ? answers
    : answers.filter((_, i) => i !== index);

export const moveAnswer = (
  answers: Answer[],
  index: number,
  delta: -1 | 1,
): Answer[] => {
  const to = index + delta;
  if (index < 0 || index >= answers.length || to < 0 || to >= answers.length)
    return answers;
  const next = answers.slice();
  [next[index], next[to]] = [next[to], next[index]];
  return next;
};

/** Corps d'enregistrement : seuls ces champs partent au serveur (les votes d'un sondage existant sont conservés tels quels). */
export const toPayload = (p: {
  icon?: string;
  question: string;
  end: Date | string;
  answers: Answer[];
}) => ({
  icon: p.icon,
  question: p.question.trim(),
  end: p.end instanceof Date ? p.end.toISOString() : p.end,
  answers: p.answers
    .filter((a) => (a.value ?? "").trim())
    .map((a) => ({ ...a, value: (a.value ?? "").trim() })),
});

/** Date de fin proposée à la création : dans sept jours. */
export const defaultEnd = (now: Date = new Date()): Date =>
  new Date(now.getTime() + 7 * 24 * 3600 * 1000);

/** `AAAA-MM-JJ` pour un champ date. */
export const toInputDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Fin de journée locale pour une date saisie : un sondage dure jusqu'au soir de la date choisie. */
export const fromInputDate = (value: string): Date =>
  new Date(`${value}T23:59:59`);

const RIGHT_VOTE = "net-atos-entng-poll-controllers-PollController|vote";
const RIGHT_MANAGE = "net-atos-entng-poll-controllers-PollController|delete";

/**
 * Droits de l'utilisateur sur un sondage, comme l'ancienne interface : le propriétaire peut tout ; sinon les droits viennent
 * des partages faits à lui-même ou à l'un de ses groupes (répondre = « vote », gérer = « delete »).
 */
export const rightsOf = (
  p: Poll,
  userId: string,
  groupIds: string[],
): NonNullable<Poll["myRights"]> => {
  if (p.owner?.userId === userId)
    return { read: true, contrib: true, manage: true };
  const mine = (p.shared ?? []).filter(
    (e) =>
      e.userId === userId ||
      (typeof e.groupId === "string" && groupIds.includes(e.groupId)),
  );
  return {
    read: mine.length > 0,
    contrib: mine.some((e) => e[RIGHT_VOTE] === true),
    manage: mine.some((e) => e[RIGHT_MANAGE] === true),
  };
};

export const withRights = (
  polls: Poll[],
  userId: string,
  groupIds: string[],
): Poll[] =>
  polls.map((p) => ({ ...p, myRights: rightsOf(p, userId, groupIds) }));
