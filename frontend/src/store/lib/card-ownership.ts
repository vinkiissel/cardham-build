import {
  type Card,
  type Collection,
  SPECIAL_CARD_CODES,
} from "@arkham-build/shared";
import type { Metadata } from "../slices/metadata.types";
import type { LookupTables } from "./lookup-tables.types";

/**
 * Prefix for collection keys that track single proxied cards instead of packs.
 * Proxies are stored in `settings.proxies` and merged into the collection by `selectCollection`.
 */
export const PROXY_KEY_PREFIX = "proxy:";

export function proxyKey(code: string) {
  return `${PROXY_KEY_PREFIX}${code}`;
}

const cardPoolCache = new WeakMap<LookupTables, Map<string, string[]>>();

/**
 * Returns the codes of all printings that share a physical card pool with `code`, including `code` itself.
 * Printings share a pool when they are marked as duplicates, or when one is a reprint of the other
 * with identical name and text (e.g. Working a Hunch in the 2026 core set).
 * Reprints with changed text (e.g. Perception in the 2026 core set) have their own pool.
 */
export function cardPoolCodes(
  code: string,
  metadata: Metadata,
  lookupTables: LookupTables,
): string[] {
  let cache = cardPoolCache.get(lookupTables);

  if (!cache) {
    cache = new Map();
    cardPoolCache.set(lookupTables, cache);
  }

  const cached = cache.get(code);
  if (cached) return cached;

  const { basePrints, duplicates, reprints } = lookupTables.relations;

  const pool = new Set([code]);
  const queue = [code];

  const hasSameText = (a: string, b: string) => {
    const cardA = metadata.cards[a];
    const cardB = metadata.cards[b];

    return (
      !!cardA &&
      !!cardB &&
      cardA.real_name === cardB.real_name &&
      (cardA.real_text ?? "") === (cardB.real_text ?? "")
    );
  };

  while (queue.length) {
    const current = queue.pop() as string;

    const related = [
      ...Object.keys(duplicates[current] ?? {}),
      ...Object.keys(reprints[current] ?? {}).filter((other) =>
        hasSameText(current, other),
      ),
      ...Object.keys(basePrints[current] ?? {}).filter((other) =>
        hasSameText(current, other),
      ),
    ];

    for (const other of related) {
      if (!pool.has(other)) {
        pool.add(other);
        queue.push(other);
      }
    }
  }

  const codes = Array.from(pool).sort();

  for (const poolCode of codes) {
    cache.set(poolCode, codes);
  }

  return codes;
}

export type CardOwnershipOptions = {
  card: Card;
  collection: Collection;
  lookupTables: LookupTables;
  metadata: Metadata;
  showAllCards?: boolean;
  strict?: boolean;
};

export function ownedCardCount(options: CardOwnershipOptions) {
  const { card, metadata, lookupTables, collection, showAllCards, strict } =
    options;
  if (card.code === SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS) {
    return card.quantity;
  }

  // Treat fan-made content as owned when not checking the pack filter.
  if (!card.official && !strict) return card.quantity;

  if (card.official && showAllCards) return card.quantity;

  let quantityOwned = 0;

  // direct pack ownership.
  const packOwnership = collection[card.pack_code];

  if (packOwnership) {
    const packsOwned = typeof packOwnership === "number" ? packOwnership : 1;
    quantityOwned += packsOwned * card.quantity;
  }

  const pack = metadata.packs[card.pack_code];

  // ownership of the format.
  const reprintId = `${pack.cycle_code}${card.encounter_code ? "c" : "p"}`;

  if (card.pack_code !== reprintId && collection[reprintId]) {
    quantityOwned += card.quantity;
  }

  const duplicates = lookupTables.relations.duplicates[card.code];

  // HACK: ownership of the revised core encounters.
  if (
    !duplicates &&
    pack.cycle_code === "core" &&
    collection["rcore"] &&
    card.encounter_code
  ) {
    quantityOwned += card.quantity;
  }

  quantityOwned += collection[proxyKey(card.code)] ?? 0;

  // other printings of the card, see `cardPoolCodes`.
  for (const code of cardPoolCodes(card.code, metadata, lookupTables)) {
    if (code === card.code) continue;

    quantityOwned += collection[proxyKey(code)] ?? 0;

    const duplicate = metadata.cards[code];

    if (!duplicate) {
      continue;
    }

    const packCode = duplicate.pack_code;
    if (packCode && collection[packCode]) {
      const packsOwned =
        typeof collection[packCode] === "number" ? collection[packCode] : 1;
      quantityOwned += packsOwned * duplicate.quantity;
    }
  }

  return quantityOwned;
}
