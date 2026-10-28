# Physical card pool

This fork tracks which physical cards are still free for deck building.

## Card pool

Your card pool is everything you own:

- **Packs** – Settings → Collection, as in upstream arkham.build. Uncheck "Show all cards as owned" so the app uses your collection.
- **Single cards** – Settings → Collection → Single cards. Add proxies, promo cards or anything else you own outside of packs, with a quantity per card.

Printings of a card share one pool when they have the same name and text, no matter which product they come from. For example, Working a Hunch from the Core Set, the Revised Core Set and the 2026 Core Set are one pool. Reprints whose text changed, like Perception in the 2026 Core Set, have their own pool.

## Built decks

Every deck in the left sidebar has a **Built** switch. Built decks are listed in their own section above unbuilt decks.

Cards in a built deck are taken out of the pool:

| Counts against the pool | Does not count |
| --- | --- |
| Main deck | Side deck (planning only) |
| Extra decks, e.g. Joe Diamond's hunch deck | Signature cards and signature weaknesses |
| Basic weaknesses | Bonded cards, e.g. Soothing Melody |
| | The "Random basic weakness" placeholder |

Only the latest version of a deck counts. When you upgrade a built deck, cards that you swap out return to the pool.

Copies of a deck are never built: imported decks, imported shared decks, duplicates and JSON exports all start as unbuilt.

## In-use highlighting

Cards used by other built decks stay visible and usable everywhere, but get a badge next to their name:

- `1/3` – one of your three copies is still available.
- With "Show all cards as owned" enabled, the badge shows how many copies are in use instead.
- The badge turns yellow when the current deck uses more copies than are available.

Hover the badge to see which built decks use the card. The card detail window lists the same decks with links.

## Sharing decks

On a deck's page, **Copy build code** and **Copy link** share the deck without an account. Opening the link, or pasting the code into **Import deck** next to the deck list, imports a copy in any browser. Shared decks always start as unbuilt.

## Where the data lives

- **Built flag** – stored in the deck's `meta` field (`"built": "true"`), so it is kept in backups.
- **Single cards** – stored in the `proxies` setting.

Both are stored in the browser. On instances with accounts, they are also synced with the account.

## Code

- `frontend/src/store/lib/card-usage.ts` – which deck slots use physical copies, usage per card.
- `frontend/src/store/lib/card-ownership.ts` – owned copies, including single cards and reprints (`cardPoolCodes`).
- `frontend/src/store/selectors/card-usage.ts` – availability per card for the UI.
- `frontend/src/store/lib/deck-code.ts` – build codes.
- `frontend/src/components/deck-summary/built-toggle.tsx`, `frontend/src/components/card-usage-indicator.tsx`, `frontend/src/pages/settings/proxies.tsx`, `frontend/src/components/deck-display/deck-build-code.tsx`, `frontend/src/pages/deck-code-import/deck-code-import.tsx` – UI.
- `frontend/src/utils/base-path.ts` – serving the app from a sub-folder (GitHub Pages).
