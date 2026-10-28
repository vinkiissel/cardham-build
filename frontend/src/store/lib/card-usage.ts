import { type Deck, SPECIAL_CARD_CODES } from "@arkham-build/shared";
import { REGEX_BONDED } from "@/utils/constants";
import type { Metadata } from "../slices/metadata.types";
import { cardPoolCodes } from "./card-ownership";
import { decodeDeckMeta } from "./deck-meta";
import type { LookupTables } from "./lookup-tables.types";
import { decodeExtraSlots } from "./slots";

/**
 * Deck meta key that marks a deck as physically built.
 * Cards in built decks are no longer available to other decks.
 */
export const BUILT_DECK_META_KEY = "built";

export type CardUsageEntry = {
  /** Total copies used by built decks. */
  quantity: number;
  /** Copies used per built deck. */
  decks: Record<string, number>;
};

/**
 * Card usage of built decks, keyed by canonical card code.
 * Reprints with identical text share a canonical code (see `canonicalCardCode`).
 */
export type CardUsage = Record<string, CardUsageEntry>;

export function isBuiltDeck(deck: Deck) {
  return decodeDeckMeta(deck)[BUILT_DECK_META_KEY] === "true";
}

/**
 * Returns the deck without the built flag. Used for copies of a deck, e.g. imports,
 * duplicates and exports, which must not take cards from the owner's card pool.
 */
export function withoutBuiltFlag<T extends Deck>(deck: T): T {
  const meta = decodeDeckMeta(deck);
  if (!(BUILT_DECK_META_KEY in meta)) return deck;

  delete meta[BUILT_DECK_META_KEY];
  return { ...deck, meta: JSON.stringify(meta) };
}

/**
 * Returns a code shared by all printings of a card that use the same physical card pool.
 * See `cardPoolCodes` for which printings share a pool.
 */
export function canonicalCardCode(
  code: string,
  metadata: Metadata,
  lookupTables: LookupTables,
) {
  return cardPoolCodes(code, metadata, lookupTables)[0];
}

/**
 * Whether a deck slot consumes a physical copy from the card pool.
 * Signature cards, bonded cards and the random basic weakness placeholder do not.
 */
function usesPhysicalCopy(code: string, metadata: Metadata) {
  if (code === SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS) return false;

  const card = metadata.cards[code];
  if (!card?.official) return false;
  if (card.type_code === "investigator") return false;
  if (card.restrictions?.investigator) return false;
  if (card.real_text && REGEX_BONDED.test(card.real_text)) return false;

  return true;
}

/**
 * Card quantities a deck takes from the card pool.
 * Includes the main deck and extra decks, but not the side deck, which is only used for planning.
 */
export function deckCardUsage(
  deck: Deck,
  metadata: Metadata,
  lookupTables: LookupTables,
) {
  const usage: Record<string, number> = {};

  const slotSources = [deck.slots, decodeExtraSlots(decodeDeckMeta(deck))];

  for (const slots of slotSources) {
    for (const [code, quantity] of Object.entries(slots)) {
      if (!quantity || !usesPhysicalCopy(code, metadata)) continue;
      const canonical = canonicalCardCode(code, metadata, lookupTables);
      usage[canonical] = (usage[canonical] ?? 0) + quantity;
    }
  }

  return usage;
}

/**
 * Computes how many copies of each card are used by built decks.
 * Only the latest version of an upgraded deck counts, so cards removed during an upgrade return to the pool.
 */
export function computeCardUsage(
  decks: Deck[],
  metadata: Metadata,
  lookupTables: LookupTables,
): CardUsage {
  const usage: CardUsage = {};

  for (const deck of decks) {
    if (deck.next_deck || !isBuiltDeck(deck)) continue;

    const deckUsage = deckCardUsage(deck, metadata, lookupTables);

    for (const [code, quantity] of Object.entries(deckUsage)) {
      usage[code] ??= { quantity: 0, decks: {} };
      usage[code].quantity += quantity;
      usage[code].decks[deck.id] = quantity;
    }
  }

  return usage;
}

/**
 * Copies of a card used by built decks other than `excludeDeckId`.
 */
export function usedElsewhere(
  entry: CardUsageEntry | undefined,
  excludeDeckId?: string | number,
) {
  if (!entry) return { quantity: 0, decks: {} as Record<string, number> };

  if (excludeDeckId == null || !entry.decks[excludeDeckId]) {
    return entry;
  }

  const { [excludeDeckId]: excluded, ...decks } = entry.decks;

  return { quantity: entry.quantity - excluded, decks };
}
