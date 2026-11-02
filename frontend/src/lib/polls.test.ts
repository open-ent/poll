import { describe, expect, it } from "vitest";
import {
  canVote,
  defaultEnd,
  draftProblem,
  endDate,
  fromInputDate,
  hasAlreadyVoted,
  hasExpired,
  moveAnswer,
  percent,
  removeAnswer,
  sortPolls,
  toInputDate,
  toPayload,
  totalVotes,
  Poll,
  rightsOf,
  withRights,
} from "./polls";

const NOW = new Date("2026-11-02T10:00:00Z");
const poll = (over: Partial<Poll> = {}): Poll => ({
  _id: "p",
  question: "Q ?",
  end: "2026-11-10T00:00:00Z",
  answers: [
    { value: "A", votes: [] },
    { value: "B", votes: [] },
  ],
  owner: { userId: "owner", displayName: "Owner" },
  myRights: { contrib: true },
  ...over,
});

describe("sondages", () => {
  it("lit la date de fin sous ses deux formes", () => {
    expect(endDate({ end: "2026-11-10T00:00:00Z" }).toISOString()).toBe(
      "2026-11-10T00:00:00.000Z",
    );
    expect(
      endDate({ end: { $date: "2026-11-10T00:00:00Z" } }).toISOString(),
    ).toBe("2026-11-10T00:00:00.000Z");
  });

  it("détecte un sondage terminé", () => {
    expect(hasExpired(poll(), NOW)).toBe(false);
    expect(hasExpired(poll({ end: "2026-11-01T00:00:00Z" }), NOW)).toBe(true);
  });

  it("compte les votes, repère mon vote et calcule les pourcentages", () => {
    const p = poll({
      answers: [
        { value: "A", votes: ["u1", "u2", "me"] },
        { value: "B", votes: ["u3"] },
      ],
    });
    expect(totalVotes(p)).toBe(4);
    expect(hasAlreadyVoted(p, "me")).toBe(true);
    expect(hasAlreadyVoted(p, "zz")).toBe(false);
    expect(percent(p.answers[0], 4)).toBe(75);
    expect(percent(p.answers[1], 4)).toBe(25);
    expect(percent(p.answers[0], 0)).toBe(0);
  });

  it("autorise le vote seulement si en cours, pas encore voté et droit de répondre", () => {
    expect(canVote(poll(), "me", NOW)).toBe(true);
    expect(canVote(poll({ myRights: { contrib: false } }), "me", NOW)).toBe(
      false,
    );
    expect(canVote(poll({ end: "2026-11-01T00:00:00Z" }), "me", NOW)).toBe(
      false,
    );
    expect(
      canVote(
        poll({ answers: [{ value: "A", votes: ["me"] }, { value: "B" }] }),
        "me",
        NOW,
      ),
    ).toBe(false);
  });

  it("classe les sondages comme l'ancienne interface", () => {
    const mine = poll({
      _id: "mine",
      owner: { userId: "me", displayName: "Moi" },
    });
    const open = poll({ _id: "open" });
    const voted = poll({
      _id: "voted",
      answers: [{ value: "A", votes: ["me"] }, { value: "B" }],
    });
    const over = poll({ _id: "over", end: "2026-11-01T00:00:00Z" });
    const mineOver = poll({
      _id: "mineOver",
      end: "2026-11-01T00:00:00Z",
      owner: { userId: "me", displayName: "Moi" },
    });
    const s = sortPolls([mine, mineOver, open, voted, over], "me", NOW);
    expect(s.submitted.map((p) => p._id)).toEqual(["mine"]);
    expect(s.unanswered.map((p) => p._id)).toEqual(["open"]);
    expect(s.finished.map((p) => p._id)).toEqual(["mineOver", "voted", "over"]);
  });

  it("valide la question et au moins deux réponses", () => {
    expect(draftProblem("", [{ value: "a" }, { value: "b" }])).toBe("question");
    expect(draftProblem("Q", [{ value: "a" }, { value: " " }])).toBe("answers");
    expect(draftProblem("Q", [{ value: "a" }, { value: "b" }])).toBeNull();
  });

  it("garde deux réponses au minimum et déplace sans sortir de la liste", () => {
    const a = [{ value: "1" }, { value: "2" }, { value: "3" }];
    expect(removeAnswer(a, 1).map((x) => x.value)).toEqual(["1", "3"]);
    expect(removeAnswer(a.slice(0, 2), 0)).toHaveLength(2);
    expect(moveAnswer(a, 0, 1).map((x) => x.value)).toEqual(["2", "1", "3"]);
    expect(moveAnswer(a, 0, -1)).toBe(a);
    expect(moveAnswer(a, 2, 1)).toBe(a);
  });

  it("prépare le corps d'enregistrement sans réponses vides", () => {
    const body = toPayload({
      question: " Q ",
      end: new Date("2026-11-10T00:00:00Z"),
      answers: [{ value: " a " }, { value: "" }, { value: "b" }],
    });
    expect(body).toEqual({
      icon: undefined,
      question: "Q",
      end: "2026-11-10T00:00:00.000Z",
      answers: [{ value: "a" }, { value: "b" }],
    });
  });

  it("propose sept jours et convertit les dates de saisie", () => {
    expect(defaultEnd(NOW).toISOString()).toBe("2026-11-09T10:00:00.000Z");
    expect(toInputDate(new Date(2026, 10, 9))).toBe("2026-11-09");
    expect(fromInputDate("2026-11-09").getHours()).toBe(23);
  });

  it("calcule les droits : propriétaire, partage direct, partage de groupe", () => {
    const owned = poll();
    expect(rightsOf(owned, "owner", [])).toEqual({
      read: true,
      contrib: true,
      manage: true,
    });
    const shared = poll({
      shared: [
        {
          userId: "u1",
          "net-atos-entng-poll-controllers-PollController|vote": true,
        },
        {
          groupId: "g1",
          "net-atos-entng-poll-controllers-PollController|vote": true,
          "net-atos-entng-poll-controllers-PollController|delete": true,
        },
      ],
    });
    expect(rightsOf(shared, "u1", [])).toEqual({
      read: true,
      contrib: true,
      manage: false,
    });
    expect(rightsOf(shared, "u2", ["g1"])).toEqual({
      read: true,
      contrib: true,
      manage: true,
    });
    expect(rightsOf(shared, "u3", ["g9"])).toEqual({
      read: false,
      contrib: false,
      manage: false,
    });
    expect(withRights([owned], "owner", [])[0].myRights?.manage).toBe(true);
  });
});
