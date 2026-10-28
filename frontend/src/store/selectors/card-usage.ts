import type { Card, DeckId } from "@arkham-build/shared";
import { createSelector } from "reselect";
import { ownedCardCount } from "../lib/card-ownership";
import {
  canonicalCardCode,
  computeCardUsage,
  usedElsewhere,
} from "../lib/card-usage";
import { type DeckPack, deckPacks } from "../lib/deck-packs";
import type { StoreState } from "../slices";
import {
  selectCanCheckOwnership,
  selectCollection,
  selectLookupTables,
  selectMetadata,
} from "./shared";

export type CardAvailability = {
  /** Copies owned through packs and proxies. */
  owned: number;
  /** Copies used by other built decks. */
  used: number;
  /** Copies left for the current deck. Can be negative when the pool is overcommitted. */
  available: number;
  /** Other built decks using the card, with the copies each one uses. */
  decks: { id: string; name: string; quantity: number }[];
};

export const selectCardUsage = createSelector(
  (state: StoreState) => state.data.decks,
  selectMetadata,
  selectLookupTables,
  (decks, metadata, lookupTables) =>
    computeCardUsage(Object.values(decks), metadata, lookupTables),
);

export const selectCardAvailability = createSelector(
  selectCardUsage,
  selectMetadata,
  selectLookupTables,
  selectCollection,
  (state: StoreState) => state.data.decks,
  (usage, metadata, lookupTables, collection, decks) =>
    (card: Card, excludeDeckId?: DeckId): CardAvailability => {
      const entry = usedElsewhere(
        usage[canonicalCardCode(card.code, metadata, lookupTables)],
        excludeDeckId,
      );

      const owned = ownedCardCount({
        card,
        metadata,
        lookupTables,
        collection,
        showAllCards: false,
      });

      return {
        owned,
        used: entry.quantity,
        available: owned - entry.quantity,
        decks: Object.entries(entry.decks).map(([id, quantity]) => ({
          id,
          name: decks[id]?.name ?? id,
          quantity,
        })),
      };
    },
);

export type CardConflict = {
  /** Canonical code of the card, see `canonicalCardCode`. */
  code: string;
  owned: number;
  used: number;
  /** Built decks using the card, with the copies each one uses. */
  decks: { id: string; name: string; quantity: number }[];
};

/**
 * Cards that built decks use more copies of than the collection holds, per built deck.
 * Empty when ownership is not tracked ("Show all cards as owned").
 */
export const selectBuiltDeckConflicts = createSelector(
  selectCardUsage,
  selectMetadata,
  selectLookupTables,
  selectCollection,
  selectCanCheckOwnership,
  (state: StoreState) => state.data.decks,
  (usage, metadata, lookupTables, collection, canCheckOwnership, decks) => {
    const conflicts: Record<string, CardConflict[]> = {};
    if (!canCheckOwnership) return conflicts;

    for (const [code, entry] of Object.entries(usage)) {
      const card = metadata.cards[code];
      if (!card) continue;

      const owned = ownedCardCount({
        card,
        metadata,
        lookupTables,
        collection,
        showAllCards: false,
      });

      if (entry.quantity <= owned) continue;

      const conflict: CardConflict = {
        code,
        owned,
        used: entry.quantity,
        decks: Object.entries(entry.decks).map(([id, quantity]) => ({
          id,
          name: decks[id]?.name ?? id,
          quantity,
        })),
      };

      for (const id of Object.keys(entry.decks)) {
        conflicts[id] ??= [];
        conflicts[id].push(conflict);
      }
    }

    return conflicts;
  },
);

/**
 * Packs needed by each deck, see `deckPacks`.
 */
export const selectDeckPacks = createSelector(
  (state: StoreState) => state.data.decks,
  selectMetadata,
  selectLookupTables,
  selectCollection,
  (decks, metadata, lookupTables, collection) => {
    const packs: Record<string, DeckPack[]> = {};

    for (const deck of Object.values(decks)) {
      packs[deck.id] = deckPacks(deck, metadata, lookupTables, collection);
    }

    return packs;
  },
);
