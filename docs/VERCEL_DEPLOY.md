# Vercel deployment checklist

Complete these steps after pushing the repository to GitHub. Vercel uses **native GitHub integration** — no GitHub Actions deploy workflow is required.

## Pre-deploy

- [ ] Repository is public (or Vercel team has access)
- [ ] `.env` is **not** committed (only `.env.example`)
- [ ] Debug logs and `.cursor/` artifacts are not tracked
- [ ] CI workflow (`.github/workflows/ci.yml`) passes on `main`

## Vercel project setup

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project** → import `SteamCalendar`.
3. Framework: **Next.js** (auto-detected).
4. Build command: `npm run build` (default).
5. Install command: `npm ci` (default).

## Environment variables

Set in **Project Settings → Environment Variables**:

| Variable | Production | Preview | Notes |
|----------|------------|---------|-------|
| `SESSION_SECRET` | Required | Required | `openssl rand -hex 32` — unique per environment |
| `APP_BASE_URL` | `https://<your-domain>` | Preview URL | No trailing slash |
| `STEAM_REALM` | Same as `APP_BASE_URL` | Same as preview URL | |
| `STEAM_WEB_API_KEY` | Optional | Optional | Improves wishlist reliability |

No Google Cloud or OAuth credentials are required.

## Steam configuration

- `APP_BASE_URL` and `STEAM_REALM` must match the live site URL.
- Wishlist must be **public**.

## Post-deploy smoke test

- [ ] Home page loads over HTTPS
- [ ] Steam sign-in popup completes and closes; main tab shows connected state
- [ ] Wishlist stream loads games
- [ ] Per-game **Add to Google Calendar** links open pre-filled events
- [ ] `.ics` download works and imports into a calendar app

## Branch protection

See [`.github/BRANCH_PROTECTION.md`](.github/BRANCH_PROTECTION.md) to require CI before merging to `main`.

## Custom domain (optional)

After adding a custom domain in Vercel:

1. Update `APP_BASE_URL` and `STEAM_REALM` to the custom domain.
2. Redeploy.
