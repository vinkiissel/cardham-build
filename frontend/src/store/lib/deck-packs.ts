import {
  type Collection,
  type Deck,
  SPECIAL_CARD_CODES,
} from "@arkham-build/shared";
import type { Metadata } from "../slices/metadata.types";
import { cardPoolCodes, proxyKey } from "./card-ownership";
import { decodeDeckMeta } from "./deck-meta";
import type { LookupTables } from "./lookup-tables.types";
import { decodeExtraSlots } from "./slots";

export type DeckPack = {
  code: string;
  /** Whether the collection covers the cards the deck needs from this pack. */
  owned: boolean;
};

/**
 * Packs needed to build a deck: the investigator, main deck and extra deck.
 * For cards printed in several products, a pack from the collection is preferred.
 */
export function deckPacks(
  deck: Deck,
  metadata: Metadata,
  lookupTables: LookupTables,
  collection: Collection,
): DeckPack[] {
  const codes = new Set([
    deck.investigator_code,
    ...Object.entries(deck.slots)
      .filter(([, quantity]) => quantity > 0)
      .map(([code]) => code),
    ...Object.keys(decodeExtraSlots(decodeDeckMeta(deck))),
  ]);

  const packs = new Map<string, boolean>();

  for (const code of codes) {
    const card = metadata.cards[code];
    if (!card?.official || code === SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS) {
      continue;
    }

    const printings = cardPoolCodes(code, metadata, lookupTables);
    const candidates = printings.flatMap((printing) =>
      printingPacks(printing, metadata),
    );

    const ownedPack = candidates.find((pack) => collection[pack]);
    const hasProxy = printings.some(
      (printing) => collection[proxyKey(printing)],
    );

    const pack = ownedPack ?? card.pack_code;
    packs.set(pack, !!packs.get(pack) || !!ownedPack || hasProxy);
  }

  return [...packs.entries()]
    .map(([code, owned]) => ({ code, owned }))
    .sort((a, b) => packOrder(a.code, metadata) - packOrder(b.code, metadata));
}

/**
 * Packs that contain a printing, including the repackaged formats (`<cycle>p` / `<cycle>c`).
 */
function printingPacks(code: string, metadata: Metadata) {
  const card = metadata.cards[code];
  const pack = card ? metadata.packs[card.pack_code] : undefined;
  if (!card || !pack) return [];

  const reprint = `${pack.cycle_code}${card.encounter_code ? "c" : "p"}`;
  return metadata.packs[reprint] && reprint !== pack.code
    ? [pack.code, reprint]
    : [pack.code];
}

function packOrder(code: string, metadata: Metadata) {
  const pack = metadata.packs[code];
  const cycle = pack ? metadata.cycles[pack.cycle_code] : undefined;
  return (cycle?.position ?? 999) * 1000 + (pack?.position ?? 0);
}
