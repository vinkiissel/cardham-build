import type { Deck } from "@arkham-build/shared";
import { beforeAll, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { getMockStore } from "@/test/get-mock-store";
import { selectLookupTables, selectMetadata } from "../selectors/shared";
import type { StoreState } from "../slices";
import { ownedCardCount, proxyKey } from "./card-ownership";
import {
  canonicalCardCode,
  computeCardUsage,
  isBuiltDeck,
  usedElsewhere,
  withoutBuiltFlag,
} from "./card-usage";

function deck(
  id: string,
  slots: Record<string, number>,
  meta: Record<string, string> = { built: "true" },
  overrides: Partial<Deck> = {},
): Deck {
  return {
    id,
    investigator_code: "01001",
    meta: JSON.stringify(meta),
    next_deck: null,
    previous_deck: null,
    sideSlots: null,
    slots,
    ...overrides,
  } as Deck;
}

describe("card usage", () => {
  let store: StoreApi<StoreState>;

  beforeAll(async () => {
    store = await getMockStore();
  });

  function usage(decks: Deck[]) {
    const state = store.getState();
    return computeCardUsage(
      decks,
      selectMetadata(state),
      selectLookupTables(state),
    );
  }

  it("detects built decks", () => {
    expect(isBuiltDeck(deck("a", {}))).toBe(true);
    expect(isBuiltDeck(deck("a", {}, {}))).toBe(false);
    expect(isBuiltDeck(deck("a", {}, { built: "false" }))).toBe(false);
  });

  it("removes the built flag from deck copies", () => {
    const copy = withoutBuiltFlag(
      deck("a", {}, { built: "true", extra_deck: "01090" }),
    );

    expect(isBuiltDeck(copy)).toBe(false);
    expect(JSON.parse(copy.meta)).toEqual({ extra_deck: "01090" });
  });

  it("only counts built decks", () => {
    const result = usage([
      deck("built", { "01020": 1 }),
      deck("unbuilt", { "01020": 1 }, {}),
    ]);

    expect(result["01020"]).toEqual({ quantity: 1, decks: { built: 1 } });
  });

  it("shares a pool between identical reprints", () => {
    const state = store.getState();
    expect(
      canonicalCardCode(
        "01590",
        selectMetadata(state),
        selectLookupTables(state),
      ),
    ).toEqual("01090");

    const result = usage([
      deck("a", { "01090": 1 }),
      deck("b", { "01590": 2 }),
    ]);

    expect(result["01090"]).toEqual({ quantity: 3, decks: { a: 1, b: 2 } });
  });

  it("shares a pool with same-text reprints in newer products", () => {
    // Working a Hunch: core, revised core and 2026 core set.
    const result = usage([
      deck("a", { "01037": 1 }),
      deck("b", { "01537": 1 }),
      deck("c", { "12038": 1 }),
    ]);

    expect(result["01037"]).toEqual({
      quantity: 3,
      decks: { a: 1, b: 1, c: 1 },
    });
  });

  it("keeps reprints with changed text separate", () => {
    const result = usage([
      deck("a", { "01090": 2 }),
      deck("b", { "12093": 2 }),
    ]);

    expect(result["01090"].quantity).toEqual(2);
    expect(result["12093"].quantity).toEqual(2);
  });

  it("only counts the latest version of an upgraded deck", () => {
    const result = usage([
      deck("v1", { "01020": 1, "01090": 2 }, undefined, { next_deck: "v2" }),
      deck("v2", { "01090": 2 }, undefined, { previous_deck: "v1" }),
    ]);

    expect(result["01020"]).toBeUndefined();
    expect(result["01090"]).toEqual({ quantity: 2, decks: { v2: 2 } });
  });

  it("counts extra decks but not side decks", () => {
    const result = usage([
      deck(
        "a",
        { "01020": 1 },
        { built: "true", extra_deck: "01090,01090" },
        { sideSlots: { "01088": 2 } },
      ),
    ]);

    expect(result["01020"].quantity).toEqual(1);
    expect(result["01090"].quantity).toEqual(2);
    expect(result["01088"]).toBeUndefined();
  });

  it("ignores signatures, bonded cards and the random basic weakness", () => {
    const result = usage([
      deck("a", {
        // Roland's .38 Special, Cover Up
        "01006": 1,
        "01007": 1,
        // Hallowed Mirror, Soothing Melody
        "05313": 1,
        "05314": 3,
        // Random basic weakness, Paranoia
        "01000": 1,
        "01097": 1,
      }),
    ]);

    expect(Object.keys(result).sort()).toEqual(["01097", "05313"]);
  });

  it("counts owned copies across printings and proxies", () => {
    const state = store.getState();
    const metadata = selectMetadata(state);
    const lookupTables = selectLookupTables(state);

    const owned = (code: string, collection: Record<string, number>) =>
      ownedCardCount({
        card: metadata.cards[code],
        collection,
        lookupTables,
        metadata,
      });

    // Working a Hunch is owned through the 2026 core set.
    expect(owned("01037", { core_2026: 1 })).toEqual(2);
    expect(owned("12038", { core: 1 })).toEqual(1);
    // Perception from the 2026 core set has changed text.
    expect(owned("01090", { core_2026: 1 })).toEqual(0);
    // Proxies count for every printing in the pool.
    expect(owned("01037", { [proxyKey("12038")]: 1 })).toEqual(1);
    expect(owned("01037", { core: 1, [proxyKey("01037")]: 2 })).toEqual(3);
  });

  it("excludes the deck being edited", () => {
    const [entry] = Object.values(
      usage([deck("a", { "01020": 1 }), deck("b", { "01020": 1 })]),
    );

    expect(usedElsewhere(entry, "a")).toEqual({
      quantity: 1,
      decks: { b: 1 },
    });
    expect(usedElsewhere(entry).quantity).toEqual(2);
  });
});
