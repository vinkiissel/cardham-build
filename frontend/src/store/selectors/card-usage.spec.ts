import { describe, expect, it } from "vitest";
import { makeTestDeck } from "@/test/factories";
import { getMockStore } from "@/test/get-mock-store";
import { selectBuiltDeckConflicts } from "./card-usage";

const built = JSON.stringify({ built: "true" });

describe("selectBuiltDeckConflicts", () => {
  async function storeWith(showAllCards: boolean) {
    const store = await getMockStore();
    const state = store.getState();

    store.setState({
      settings: { ...state.settings, showAllCards, collection: { core: 1 } },
      data: {
        ...state.data,
        decks: {
          // Working a Hunch: 1 copy in the core set, used once by each built deck.
          a: makeTestDeck({
            id: "a",
            name: "A",
            meta: built,
            slots: { "01037": 1, "01020": 1 },
          }),
          b: makeTestDeck({
            id: "b",
            name: "B",
            meta: built,
            slots: { "01037": 1 },
          }),
          c: makeTestDeck({ id: "c", name: "C", slots: { "01037": 2 } }),
        },
      },
    });

    return store;
  }

  it("lists cards used by built decks beyond the collection", async () => {
    const store = await storeWith(false);
    const conflicts = selectBuiltDeckConflicts(store.getState());

    expect(Object.keys(conflicts).sort()).toEqual(["a", "b"]);
    expect(conflicts.a).toEqual([
      {
        code: "01037",
        owned: 1,
        used: 2,
        decks: [
          { id: "a", name: "A", quantity: 1 },
          { id: "b", name: "B", quantity: 1 },
        ],
      },
    ]);
  });

  it("reports no conflicts when ownership is not tracked", async () => {
    const store = await storeWith(true);
    expect(selectBuiltDeckConflicts(store.getState())).toEqual({});
  });
});
