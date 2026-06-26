# Steam Wishlist Calendar

> **AI-first development:** This application was designed and built primarily using **AI coding tools, models, and agents** (including Cursor and large language models). Human review was applied, but contributors should assume AI-generated patterns, documentation, and implementation choices throughout the codebase.

Turn upcoming games from your public Steam wishlist into calendar reminders via **per-game Google Calendar links** or a downloadable **`.ics` file** — no Google account connection or OAuth required.

## Features

- Steam OpenID sign-in (popup flow returns to the main tab)
- Live wishlist streaming with concrete release-date filtering
- Per-game **Add to Google Calendar** links (opens Google's event UI)
- Bulk `.ics` export for Google Calendar, Outlook, Thunderbird, and more
- Encrypted HTTP-only session cookies; no persistent user database

## Prerequisites

- **Node.js 20+**
- **npm**
- A **public** Steam wishlist

## Local development

```bash
git clone https://github.com/YOUR_USERNAME/SteamCalendar.git
cd SteamCalendar
cp .env.example .env
```

Generate a session secret:

```bash
openssl rand -hex 32
```

Paste the output into `SESSION_SECRET` in `.env`, then install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | Yes | 64-character hex string (32 bytes). Encrypts session cookies. |
| `APP_BASE_URL` | Yes | Public app URL, no trailing slash (e.g. `http://localhost:3000`). |
| `STEAM_REALM` | Yes | Steam OpenID realm; usually same as `APP_BASE_URL`. |
| `STEAM_WEB_API_KEY` | No | Steam Web API key; improves wishlist fetch reliability. |

See [`.env.example`](.env.example) for a copy-paste template.

**Never commit `.env` or real secrets to git.**

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Run production server locally |
| `npm run lint` | ESLint |
| `npm test` | Run unit and integration tests (Vitest) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Vitest with coverage report |

## Testing

Tests live in `lib/**/*.test.ts` and `tests/integration/**/*.test.ts`. CI runs lint, test, and build on every pull request to `main`.

```bash
npm test
```

## Deployment on Vercel

Vercel is the recommended host for this Next.js app. Use **Vercel's native GitHub integration** (not a separate GitHub Actions deploy workflow).

For a step-by-step checklist, see [docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md).

### 1. Import the repository

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project** and import this repository.
3. Framework preset: **Next.js** (auto-detected).
4. Build command: `npm run build` (default).

### 2. Set environment variables

In the Vercel project **Settings → Environment Variables**, add:

| Variable | Production | Preview |
|----------|------------|---------|
| `SESSION_SECRET` | Unique 64-char hex | Unique per environment |
| `APP_BASE_URL` | `https://your-app.vercel.app` | Preview URL or fixed preview domain |
| `STEAM_REALM` | Same as `APP_BASE_URL` | Same as preview `APP_BASE_URL` |
| `STEAM_WEB_API_KEY` | Optional | Optional |

Generate production `SESSION_SECRET` with `openssl rand -hex 32`. **Do not reuse** development secrets.

### 3. Configure Steam OpenID

**Steam OpenID** uses `APP_BASE_URL` and `STEAM_REALM` from [`app/api/steam/start/route.ts`](app/api/steam/start/route.ts). Both must match the live site URL.

### 4. Deploy and verify

1. Push to `main` — Vercel deploys automatically.
2. Smoke test on production:
   - Steam sign-in (popup closes, main tab updates)
   - Wishlist loads
   - Per-game Google Calendar links open correctly
   - `.ics` download and import

### 5. Branch protection

After the first CI run on GitHub, enable branch protection on `main` — see [`.github/BRANCH_PROTECTION.md`](.github/BRANCH_PROTECTION.md).

## Contributing

1. Fork and create a feature branch.
2. Run `npm run lint`, `npm test`, and `npm run build` locally.
3. Open a pull request using the PR template.
4. Ensure CI passes before merge.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting. Do not post secrets in public issues.

## License

[MIT](LICENSE)
