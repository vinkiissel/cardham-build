import { describe, expect, it } from "vitest";
import { makeTestDeck } from "@/test/factories";
import { ARCHIVE_FOLDER_ID } from "@/utils/constants";
import type { DataSlice } from "../slices/data.types";
import { isBuiltDeck } from "./card-usage";
import {
  createDeckBundle,
  type DeckBundle,
  isDeckBundle,
  mergeDeckBundle,
} from "./deck-bundle";

// The factory's default version does not pass the deck schema.
const deck = (overrides: Parameters<typeof makeTestDeck>[0]) =>
  makeTestDeck({ version: "0.1", ...overrides });

function data(overrides: Partial<DataSlice["data"]> = {}): DataSlice["data"] {
  return { decks: {}, folders: {}, deckFolders: {}, history: {}, ...overrides };
}

const v1 = deck({
  id: "v1",
  name: "Roland",
  next_deck: "v2",
  slots: { "01020": 1 },
});
const v2 = deck({
  id: "v2",
  name: "Roland",
  previous_deck: "v1",
  slots: { "01020": 2 },
  meta: JSON.stringify({ built: "true" }),
});
const other = deck({ id: "other", name: "Daisy", slots: { "01037": 2 } });

const source = data({
  decks: { v1, v2, other },
  history: { v2: ["v1"], other: [] },
  folders: { f1: { id: "f1", name: "Campaign" } },
  deckFolders: { v2: "f1", v1: "f1", other: ARCHIVE_FOLDER_ID },
});

describe("deck bundles", () => {
  it("round-trips all decks with history, folders and the built flag", () => {
    const bundle = JSON.parse(JSON.stringify(createDeckBundle(source)));
    expect(isDeckBundle(bundle)).toBe(true);

    const result = mergeDeckBundle(data(), bundle);

    expect(result.imported).toEqual(2);
    expect(result.skipped).toEqual(0);
    expect(Object.keys(result.data.decks).sort()).toEqual([
      "other",
      "v1",
      "v2",
    ]);
    expect(result.data.history).toEqual({ v2: ["v1"], other: [] });
    expect(result.data.folders).toEqual(source.folders);
    expect(result.data.deckFolders).toEqual(source.deckFolders);
    expect(isBuiltDeck(result.data.decks.v2)).toBe(true);
  });

  it("skips decks that already exist by id", () => {
    const bundle = createDeckBundle(source);
    const result = mergeDeckBundle(data({ decks: { v2 } }), bundle);

    expect(result.imported).toEqual(1);
    expect(result.skipped).toEqual(1);
    expect(result.data.decks.v1).toBeUndefined();
  });

  it("skips decks with the same contents under another id", () => {
    const copy = deck({ ...other, id: "imported-copy" });
    const result = mergeDeckBundle(
      data({ decks: { "imported-copy": copy } }),
      createDeckBundle(source),
    );

    expect(result.skipped).toEqual(1);
    expect(result.data.decks.other).toBeUndefined();
  });

  it("ignores invalid decks", () => {
    const bundle = {
      ...createDeckBundle(data({ decks: { other } })),
      decks: [{ id: "broken" }, other],
    } as unknown as DeckBundle;

    const result = mergeDeckBundle(data(), bundle);
    expect(Object.keys(result.data.decks)).toEqual(["other"]);
  });
});
