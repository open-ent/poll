import { describe, expect, it } from "vitest";
import { daysLeft, leaderIndex, Poll } from "./polls";

const poll = (end: string, votes: number[] = []): Poll => ({
  question: "Q",
  end,
  answers: votes.map((n) => ({ value: "r", votes: Array(n).fill("u") })),
});

describe("échéance et réponse en tête", () => {
  const now = new Date("2026-11-27T10:00:00");
  it("compte les jours calendaires jusqu'à la clôture", () => {
    expect(daysLeft(poll("2026-11-27T23:59:59"), now)).toBe(0);
    expect(daysLeft(poll("2026-11-28T23:59:59"), now)).toBe(1);
    expect(daysLeft(poll("2026-12-02T23:59:59"), now)).toBe(5);
  });
  it("renvoie null pour un sondage terminé", () => {
    expect(daysLeft(poll("2026-11-26T23:59:59"), now)).toBeNull();
  });
  it("désigne la réponse la plus votée, la première en cas d'égalité", () => {
    expect(leaderIndex(poll("2026-12-01", [1, 3, 2]))).toBe(1);
    expect(leaderIndex(poll("2026-12-01", [2, 2]))).toBe(0);
    expect(leaderIndex(poll("2026-12-01", [0, 0]))).toBeNull();
  });
});
