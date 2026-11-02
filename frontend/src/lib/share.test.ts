import { describe, expect, it } from "vitest";
import {
  filterVisibles,
  levelOf,
  namesUpTo,
  shareBody,
  ShareAction,
  toggleLevel,
} from "./share";

const ACTIONS: ShareAction[] = [
  { name: ["m1", "m2"], displayName: "poll.manager", type: "RESOURCE" },
  { name: ["r1"], displayName: "poll.read", type: "RESOURCE" },
  { name: ["c1"], displayName: "poll.contrib", type: "RESOURCE" },
];

describe("partage d'un sondage", () => {
  it("un niveau inclut ceux qui le précèdent", () => {
    expect(namesUpTo(ACTIONS, "poll.read")).toEqual(["r1"]);
    expect(namesUpTo(ACTIONS, "poll.contrib").sort()).toEqual(["c1", "r1"]);
    expect(namesUpTo(ACTIONS, "poll.manager").sort()).toEqual([
      "c1",
      "m1",
      "m2",
      "r1",
    ]);
  });

  it("repère le plus haut niveau accordé", () => {
    expect(levelOf(ACTIONS, undefined)).toBeNull();
    expect(levelOf(ACTIONS, ["r1"])).toBe("poll.read");
    expect(levelOf(ACTIONS, ["r1", "c1"])).toBe("poll.contrib");
    expect(levelOf(ACTIONS, ["r1", "c1", "m1"])).toBe("poll.contrib");
    expect(levelOf(ACTIONS, ["r1", "c1", "m1", "m2"])).toBe("poll.manager");
  });

  it("cocher « gérer » coche aussi répondre et lire ; décocher « lire » retire tout", () => {
    expect(toggleLevel(ACTIONS, [], "poll.manager").sort()).toEqual([
      "c1",
      "m1",
      "m2",
      "r1",
    ]);
    expect(toggleLevel(ACTIONS, ["r1", "c1"], "poll.read")).toEqual([]);
    expect(
      toggleLevel(ACTIONS, ["r1", "c1", "m1", "m2"], "poll.manager").sort(),
    ).toEqual(["c1", "r1"]);
    expect(toggleLevel(ACTIONS, ["r1"], "poll.contrib").sort()).toEqual([
      "c1",
      "r1",
    ]);
  });

  it("n'envoie que les destinataires qui ont au moins un droit", () => {
    expect(shareBody({ u1: ["r1"], u2: [] }, { g1: [] })).toEqual({
      users: { u1: ["r1"] },
      groups: {},
    });
  });

  it("filtre les destinataires sans accent ni casse", () => {
    const list = [
      { id: "1", username: "Émilie Dupont" },
      { id: "2", name: "Classe 6A" },
    ];
    expect(filterVisibles(list, "emilie").map((v) => v.id)).toEqual(["1"]);
    expect(filterVisibles(list, "6a").map((v) => v.id)).toEqual(["2"]);
    expect(filterVisibles(list, "  ")).toHaveLength(2);
  });
});
