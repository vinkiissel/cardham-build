import type { Card, DeckId } from "@arkham-build/shared";
import { createSelector } from "reselect";
import { ownedCardCount } from "../lib/card-ownership";
import {
  canonicalCardCode,
  computeCardUsage,
  usedElsewhere,
} from "../lib/card-usage";
import type { StoreState } from "../slices";
import { selectCollection, selectLookupTables, selectMetadata } from "./shared";

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
