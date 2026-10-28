import { type Deck, isDeck } from "@arkham-build/shared";
import { ARCHIVE_FOLDER_ID } from "@/utils/constants";
import type { DataSlice, Folder } from "../slices/data.types";
import { BUILT_DECK_META_KEY } from "./card-usage";
import { decodeDeckMeta } from "./deck-meta";

/**
 * A file with all decks of a browser, used to move decks to another browser.
 * Unlike single deck exports, bundles keep deck ids, upgrade history, folders and the built flag.
 */
export const DECK_BUNDLE_TYPE = "arkham-build-decks";

type DataState = DataSlice["data"];

export type DeckBundle = {
  type: typeof DECK_BUNDLE_TYPE;
  version: 1;
  exported_at: string;
  decks: Deck[];
  history: Record<string, string[]>;
  folders: Record<string, Folder>;
  deckFolders: Record<string, string>;
};

export type DeckBundleImportResult = {
  data: DataState;
  /** Number of decks (upgrade chains count as one deck) that were added. */
  imported: number;
  /** Number of decks that were skipped because they already exist. */
  skipped: number;
};

export function createDeckBundle(data: DataState): DeckBundle {
  return {
    type: DECK_BUNDLE_TYPE,
    version: 1,
    exported_at: new Date().toISOString(),
    decks: Object.values(data.decks),
    history: data.history as Record<string, string[]>,
    folders: data.folders,
    deckFolders: data.deckFolders as Record<string, string>,
  };
}

export function isDeckBundle(x: unknown): x is DeckBundle {
  return (
    typeof x === "object" &&
    x != null &&
    "type" in x &&
    x.type === DECK_BUNDLE_TYPE &&
    "decks" in x &&
    Array.isArray(x.decks)
  );
}

/**
 * Identifies decks with the same contents, independent of their id.
 * Used to skip decks that were already imported, e.g. with a build code.
 */
export function deckSignature(deck: Deck) {
  const meta = decodeDeckMeta(deck);
  delete meta[BUILT_DECK_META_KEY];

  return JSON.stringify([
    deck.investigator_code,
    deck.name,
    sortedEntries(deck.slots),
    sortedEntries(deck.sideSlots ?? {}),
    sortedEntries(meta as Record<string, unknown>),
  ]);
}

/**
 * Adds the decks of a bundle to the existing data. Decks that already exist, by id or by contents,
 * are skipped together with their upgrade history.
 */
export function mergeDeckBundle(
  data: DataState,
  bundle: DeckBundle,
): DeckBundleImportResult {
  const bundleDecks = new Map<string, Deck>();

  for (const deck of bundle.decks) {
    if (isDeck(deck)) bundleDecks.set(String(deck.id), deck);
  }

  const existingSignatures = new Set(
    Object.values(data.decks).map(deckSignature),
  );

  const decks = { ...data.decks };
  const history = { ...data.history };
  const deckFolders = { ...data.deckFolders };
  const folders = { ...data.folders };

  let imported = 0;
  let skipped = 0;

  // Only the latest version of a deck has a history entry with its previous versions.
  const latestDecks = [...bundleDecks.values()].filter(
    (deck) => !deck.next_deck,
  );

  for (const latest of latestDecks) {
    const id = String(latest.id);

    if (decks[id] || existingSignatures.has(deckSignature(latest))) {
      skipped += 1;
      continue;
    }

    const previousIds = (bundle.history?.[id] ?? []).filter(
      (previousId) => bundleDecks.has(previousId) && !decks[previousId],
    );

    for (const deckId of [id, ...previousIds]) {
      const deck = bundleDecks.get(deckId) as Deck;
      decks[deckId] = { ...deck, source: undefined };

      const folderId = bundle.deckFolders?.[deckId];
      const folder = folderId ? bundle.folders?.[folderId] : undefined;

      if (folderId === ARCHIVE_FOLDER_ID) {
        deckFolders[deckId] = folderId;
      } else if (folderId && folder) {
        addFolder(folders, bundle.folders, folderId);
        deckFolders[deckId] = folderId;
      }
    }

    history[id] = previousIds;
    existingSignatures.add(deckSignature(latest));
    imported += 1;
  }

  return {
    data: { ...data, decks, history, folders, deckFolders },
    imported,
    skipped,
  };
}

/**
 * Adds a folder and its parent folders, unless they already exist.
 */
function addFolder(
  folders: Record<string, Folder>,
  bundleFolders: Record<string, Folder>,
  folderId: string,
) {
  let id: string | undefined = folderId;

  while (id && bundleFolders[id] && !folders[id]) {
    folders[id] = bundleFolders[id];
    id = bundleFolders[id].parent_id;
  }
}

function sortedEntries(record: Record<string, unknown>) {
  return Object.entries(record)
    .filter(([, value]) => value != null && value !== 0)
    .sort(([a], [b]) => a.localeCompare(b));
}
