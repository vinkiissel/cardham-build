import { describe, expect, it } from "vitest";
import { makeTestDeck } from "@/test/factories";
import { isBuiltDeck } from "./card-usage";
import { decodeDeckCode, encodeDeckCode, isDeckCode } from "./deck-code";

describe("deck build codes", () => {
  const deck = makeTestDeck({
    description_md: "A deck with a description.",
    meta: JSON.stringify({ built: "true", extra_deck: "01090,01090" }),
    name: "Roland Banks",
    sideSlots: { "01088": 1 },
    slots: { "01006": 1, "01007": 1, "01020": 2, "01037": 2 },
    tags: "solo guardian",
    taboo_id: 7,
  });

  it("round-trips a deck", async () => {
    const code = await encodeDeckCode(deck);

    expect(code.startsWith("ahb1.")).toBe(true);
    expect(isDeckCode(code)).toBe(true);

    const decoded = await decodeDeckCode(code);

    expect(decoded).toMatchObject({
      description_md: deck.description_md,
      investigator_code: deck.investigator_code,
      name: deck.name,
      sideSlots: deck.sideSlots,
      slots: deck.slots,
      tags: deck.tags,
      taboo_id: deck.taboo_id,
      next_deck: null,
      previous_deck: null,
    });
  });

  it("does not share the built flag", async () => {
    const decoded = await decodeDeckCode(await encodeDeckCode(deck));

    expect(isBuiltDeck(decoded)).toBe(false);
    expect(JSON.parse(decoded.meta)).toEqual({ extra_deck: "01090,01090" });
  });

  it("accepts codes inside import links", async () => {
    const code = await encodeDeckCode(deck);
    const link = `https://decks.example.com/import#${code}`;

    expect(isDeckCode(link)).toBe(true);
    expect((await decodeDeckCode(link)).name).toEqual(deck.name);
  });

  it("does not treat other input as a code", () => {
    expect(isDeckCode("https://arkhamdb.com/deck/view/123456")).toBe(false);
    expect(isDeckCode("123456")).toBe(false);
    expect(isDeckCode("https://example.com/?q=ahb1.abc")).toBe(false);
  });

  it("rejects damaged codes", async () => {
    const code = await encodeDeckCode(deck);

    await expect(decodeDeckCode(code.slice(0, -10))).rejects.toThrow(
      "The build code is incomplete or damaged.",
    );
  });

  it("ignores fields that are not part of a deck", async () => {
    const code = await encodeDeckCode({
      ...deck,
      source: "account",
    } as typeof deck);

    const decoded = await decodeDeckCode(code);
    expect(decoded.source).toBeUndefined();
  });
});
