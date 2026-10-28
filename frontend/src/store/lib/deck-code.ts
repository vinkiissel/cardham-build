import { type Deck, isDeck } from "@arkham-build/shared";
import { withBasePath } from "@/utils/base-path";
import { withoutBuiltFlag } from "./card-usage";

/**
 * Build codes are a self-contained, compressed representation of a deck.
 * They can be copied to another browser to rebuild the same deck without an account or server.
 */
const DECK_CODE_PREFIX = "ahb1.";

/** Path of the page that imports a build code from the URL hash. */
export const DECK_CODE_IMPORT_PATH = "/import";

type DeckCodePayload = Pick<
  Deck,
  | "description_md"
  | "exile_string"
  | "ignoreDeckLimitSlots"
  | "investigator_code"
  | "investigator_name"
  | "meta"
  | "name"
  | "sideSlots"
  | "slots"
  | "taboo_id"
  | "tags"
>;

export function isDeckCode(input: string) {
  return extractDeckCode(input) != null;
}

export async function encodeDeckCode(deck: Deck) {
  const shared = withoutBuiltFlag(deck);

  const payload: DeckCodePayload = {
    description_md: shared.description_md,
    exile_string: shared.exile_string,
    ignoreDeckLimitSlots: shared.ignoreDeckLimitSlots,
    investigator_code: shared.investigator_code,
    investigator_name: shared.investigator_name,
    meta: shared.meta,
    name: shared.name,
    sideSlots: shared.sideSlots,
    slots: shared.slots,
    taboo_id: shared.taboo_id,
    tags: shared.tags,
  };

  const bytes = await transform(
    new TextEncoder().encode(JSON.stringify(payload)),
    new CompressionStream("deflate-raw"),
  );

  return `${DECK_CODE_PREFIX}${toBase64Url(bytes)}`;
}

export function deckCodeLink(code: string) {
  return `${window.location.origin}${withBasePath(DECK_CODE_IMPORT_PATH)}#${code}`;
}

/**
 * Decodes a build code, or a link containing one, into a deck that can be imported.
 */
export async function decodeDeckCode(input: string): Promise<Deck> {
  const code = extractDeckCode(input);
  if (!code) throw new Error("Not a build code.");

  let payload: Partial<DeckCodePayload>;

  try {
    const bytes = await transform(
      fromBase64Url(code.slice(DECK_CODE_PREFIX.length)),
      new DecompressionStream("deflate-raw"),
    );
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    throw new Error("The build code is incomplete or damaged.", {
      cause: error,
    });
  }

  const now = new Date().toISOString();

  // Only known fields are taken over, so a code cannot set e.g. a storage provider.
  const deck = {
    description_md: payload.description_md ?? "",
    exile_string: payload.exile_string ?? null,
    ignoreDeckLimitSlots: payload.ignoreDeckLimitSlots ?? null,
    investigator_code: payload.investigator_code,
    investigator_name: payload.investigator_name ?? null,
    meta: payload.meta ?? "{}",
    name: payload.name,
    sideSlots: payload.sideSlots ?? null,
    slots: payload.slots,
    taboo_id: payload.taboo_id ?? null,
    tags: payload.tags ?? "",
    date_creation: now,
    date_update: now,
    id: "build-code",
    next_deck: null,
    previous_deck: null,
    version: "0.1",
  };

  if (!isDeck(deck)) {
    throw new Error("The build code does not contain a valid deck.");
  }

  return deck;
}

function extractDeckCode(input: string) {
  const trimmed = input.trim();
  const start = trimmed.indexOf(DECK_CODE_PREFIX);
  if (start === -1) return undefined;

  // Codes can be pasted on their own or as part of a link.
  if (start > 0 && !trimmed.slice(0, start).endsWith("#")) return undefined;

  const code = trimmed.slice(start);
  return /^[A-Za-z0-9._-]+$/.test(code) ? code : undefined;
}

async function transform(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
) {
  const writer = stream.writable.getWriter();
  void writer.write(bytes as Uint8Array<ArrayBuffer>);
  void writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
