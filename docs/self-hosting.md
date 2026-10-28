# Self-hosting a private instance

This guide sets up a private instance for a small group of people:

- **Frontend** on Cloudflare Pages (free).
- **Backend** (API, background worker, Postgres) on a single server, e.g. an Oracle Cloud "Always Free" ARM instance.
- **A domain name**, e.g. `example.com` (about €10 per year). The frontend and API must be subdomains of the same domain, e.g. `decks.example.com` and `api.example.com`, because the login session cookie is `SameSite=Strict`. Without a domain, the site still works, but logging in, sharing decks and syncing settings do not.

## 1. Domain

Register a domain or move an existing one to Cloudflare DNS. Cloudflare Registrar sells domains at cost.

## 2. Backend server

### Create the server

1. Create an Oracle Cloud account and choose your home region. It cannot be changed later.
2. Create a compute instance with the `VM.Standard.A1.Flex` shape (Ampere ARM) and Ubuntu. 1–2 OCPUs and 6–12 GB of memory are plenty. If you get an "out of capacity" error, try another availability domain or try again later.
3. In the instance's virtual cloud network, add ingress rules for TCP ports 80 and 443 to its security list. Ubuntu images on Oracle Cloud also block these ports in iptables:

   ```sh
   sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```

4. In Cloudflare DNS, add an `A` record for `api.example.com` pointing to the instance's public IP. Set it to **DNS only** (grey cloud) so Caddy can get a certificate.

### Install Docker and start the backend

```sh
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # log out and in again afterwards

git clone https://github.com/tonikyl/arkham.build.git
cd arkham.build/backend/selfhost
cp .env.example .env
```

Fill in `.env`. At a minimum, set:

- `API_DOMAIN`, `FRONTEND_URL` and `CORS_ORIGINS`
- `POSTGRES_PASSWORD`, `SESSION_SECRET` and `ADMIN_API_KEY` (generate with `openssl rand -hex 32`)
- The `SMTP_*` and `FROM_EMAIL` settings. Accounts are verified by email, and any SMTP provider with a free tier works.

Then build and start everything:

```sh
docker compose up -d --build
docker compose exec api dbmate --no-dump-schema up
docker compose exec worker npm run ingest:json-data
```

The second command creates the database tables. The third downloads the card data.

`https://api.example.com/admin/up` should now answer `ok`.

## 3. Frontend on Cloudflare Pages

1. In `wrangler.toml`, change these values under both `[vars]` and `[env.production.vars]`:
   - `VITE_API_URL` – `https://api.example.com`
   - `VITE_PAGE_NAME` – the name you want to show
   - `VITE_LEGAL_NOTICE` and `VITE_ADMIN_EMAIL` – your own contact details
   - `VITE_TURNSTILE_SITE_KEY` – empty, unless you set up Turnstile

   Commit and push the change.
2. In the Cloudflare dashboard, open **Workers & Pages → Create → Pages → Connect to Git** and select this repository.
3. Use these build settings:
   - **Framework preset** – None
   - **Build command** – `npm run build --workspace frontend`
   - **Build output directory** – `frontend/dist`
   - **Root directory** – empty (the repository root, so the `functions/` folder for link previews is picked up)
4. Under the project's **Custom domains**, add `decks.example.com`.

Every push to the production branch now redeploys the frontend.

The repository's GitHub Actions deploy workflows (`backend-deploy.yml` and `frontend-deploy.yml`) are for the upstream servers. They do nothing useful in this fork and fail without their secrets; disable them under **Actions** in the GitHub repository settings.

## 4. Keeping up to date

There are two kinds of updates: card data and code.

### New cards

Card data comes from public data repositories (`INGEST_*_REPO` in `.env`). The worker does not refresh it on a schedule. After a new product is added upstream, run:

```sh
cd arkham.build/backend/selfhost
docker compose exec worker npm run ingest:json-data
```

The frontend picks up the new data on the next page load. New packs then appear under Settings → Collection, and new cards can be added as single cards.

To refresh automatically, add a weekly cron job on the server (`crontab -e`):

```
0 5 * * 1 cd /home/ubuntu/arkham.build/backend/selfhost && docker compose exec -T worker npm run ingest:json-data
```

### Code from upstream arkham.build

New products sometimes need code changes upstream, e.g. new deck building rules. To merge them into this fork:

```sh
git remote add upstream https://github.com/fspoettel/arkham.build.git   # once
git fetch upstream
git merge upstream/main
npm ci
npm run test --workspace frontend
git push
```

The physical card pool feature lives mostly in its own files (see `docs/physical-card-pool.md`) to keep merge conflicts rare.

Pushing redeploys the frontend. To update the backend, run on the server:

```sh
cd arkham.build && git pull
cd backend/selfhost
docker compose up -d --build
docker compose exec api dbmate --no-dump-schema up
```

## Backups

Decks of logged-in users live in the server's Postgres database. Back it up regularly, e.g. with a daily cron job:

```
0 3 * * * cd /home/ubuntu/arkham.build/backend/selfhost && docker compose exec -T db pg_dump -U postgres arkham_build | gzip > /home/ubuntu/backups/arkham_build-$(date +\%F).sql.gz
```

Decks that are only stored in the browser can be backed up under Settings → Data export.
