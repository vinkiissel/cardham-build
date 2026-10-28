import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { makeTestDeck } from "@/test/factories";
import { getMockStore } from "@/test/get-mock-store";
import { selectLookupTables, selectMetadata } from "../selectors/shared";
import type { StoreState } from "../slices";
import { proxyKey } from "./card-ownership";
import { deckPacks } from "./deck-packs";

describe("deckPacks", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  // Roland Banks with Machete (core), Working a Hunch (2026 core) and a random basic weakness.
  const deck = makeTestDeck({
    investigator_code: "01001",
    slots: { "01020": 1, "12038": 2, "01000": 1 },
  });

  function packs(collection: Record<string, number>) {
    const state = store.getState();
    return deckPacks(
      deck,
      selectMetadata(state),
      selectLookupTables(state),
      collection,
    );
  }

  it("lists the packs of the deck's printings without a collection", () => {
    expect(packs({})).toEqual([
      { code: "core", owned: false },
      { code: "core_2026", owned: false },
    ]);
  });

  it("prefers owned packs for cards printed in several products", () => {
    // Working a Hunch is also in the original core set.
    expect(packs({ core: 1 })).toEqual([{ code: "core", owned: true }]);
  });

  it("treats proxied cards as owned", () => {
    expect(packs({ core: 1, [proxyKey("12038")]: 2 })).toEqual([
      { code: "core", owned: true },
    ]);
    expect(packs({ [proxyKey("12038")]: 2 })).toEqual([
      { code: "core", owned: false },
      { code: "core_2026", owned: true },
    ]);
  });
});
