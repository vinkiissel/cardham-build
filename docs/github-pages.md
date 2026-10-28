# Hosting on GitHub Pages

This fork can be published as a static site on GitHub Pages, at `https://<user>.github.io/<repository>/`. There is no server, no database and no domain to pay for.

## How it works

The workflow `.github/workflows/github-pages.yml`:

1. Starts a temporary Postgres database inside the workflow run.
2. Imports the card data from the public data repositories, using the backend's regular import.
3. Builds the frontend for the repository's sub-folder, with accounts turned off.
4. Starts the API once and saves its card data responses as static files under `api/` (`bin/export-static-card-data`).
5. Publishes the result to GitHub Pages.

It runs on every push to `main`, every Monday (to pick up new cards) and on demand.

## Setup

1. Make the repository public. GitHub Pages is free for public repositories; private repositories need a paid plan.
2. In the repository settings, open **Pages** and set **Source** to **GitHub Actions**.
3. Merge the changes into `main`. The **[Fork] Deploy to GitHub Pages** workflow builds and publishes the site, and its summary shows the address.
4. Optional: under **Settings → Secrets and variables → Actions → Variables**, set `PAGE_NAME` (the site title) and `LEGAL_NOTICE`.
5. Optional: under **Actions**, disable the upstream workflows that do not apply to the fork: `[Backend] Deploy`, `[Frontend] Deploy to Cloudflare Pages` and the full-stack test workflows.

## What works and what does not

Without a server and without accounts:

| Works | Not available |
| --- | --- |
| Card browsing, deck building, validation, upgrades | Logging in, syncing between devices |
| Collection, built decks, single cards (stored in the browser) | Deck guides and popular decks |
| Rules reference, FAQ and errata | Card recommendations |
| Sharing decks with build codes and links | Importing decks from ArkhamDB |
| JSON export and import | Deck scans, customization sheet downloads |

Decks, settings and the collection are stored in each browser. **Settings → Data export** saves a backup file, but the app has no button to restore it yet. To move decks to another browser, use build codes or the JSON export and import.

## Sharing decks

On a deck's page, **Copy link** creates a link like `https://<user>.github.io/<repository>/import#ahb1.…`. Opening it in any browser imports a copy of the deck. **Copy build code** copies just the code, which can be pasted into the **Import deck** box next to the deck list.

Build codes contain the deck itself, so they keep working without a server. They do not contain the built flag: shared decks always start as unbuilt.

## New cards

The workflow imports the latest card data every Monday. To update right away, open **Actions → [Fork] Deploy to GitHub Pages → Run workflow**.

New packs then appear under **Settings → Collection**.

## Updates from upstream arkham.build

New products sometimes need code changes upstream, e.g. new deck building rules. To merge them into the fork:

```sh
git remote add upstream https://github.com/fspoettel/arkham.build.git   # once
git fetch upstream
git merge upstream/main
npm ci
npm run test --workspace frontend
git push
```

Pushing to `main` redeploys the site. The fork's own features live mostly in separate files (see `docs/physical-card-pool.md`) to keep merge conflicts rare.

## Configuration

The fork-specific build options, all set by the workflow:

| Variable | Purpose |
| --- | --- |
| `VITE_BASE_PATH` | Sub-folder the site is served from, e.g. `/arkham.build/`. |
| `VITE_ACCOUNTS_ENABLED=false` | Hides login, account and sync features. |
| `VITE_STATIC_API=true` | Hides features that need a live backend. |
| `VITE_API_URL` | Location of the exported card data. |

Without these variables the frontend behaves like upstream arkham.build.
