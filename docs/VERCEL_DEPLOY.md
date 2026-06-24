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
| `GOOGLE_CLIENT_ID` | From GCP | From GCP | |
| `GOOGLE_CLIENT_SECRET` | From GCP | From GCP | |
| `STEAM_WEB_API_KEY` | Optional | Optional | Improves wishlist reliability |

## OAuth configuration

### Google Cloud Console

1. Enable **Google Calendar API**.
2. OAuth client type: **Web application**.
3. Authorized redirect URIs:
   - `https://<production-domain>/api/google/callback`
   - `https://<preview-deployment>.vercel.app/api/google/callback` (per preview, or wildcard if supported)

### Steam

- `APP_BASE_URL` and `STEAM_REALM` must match the live site URL.
- Wishlist must be **public**.

## Post-deploy smoke test

- [ ] Home page loads over HTTPS
- [ ] Steam sign-in popup completes and closes; main tab shows connected state
- [ ] Wishlist stream loads games
- [ ] Google connect works on production URL
- [ ] Calendar event creation succeeds (Calendar API enabled)
- [ ] `.ics` download works

## Branch protection

See [`.github/BRANCH_PROTECTION.md`](.github/BRANCH_PROTECTION.md) to require CI before merging to `main`.

## Custom domain (optional)

After adding a custom domain in Vercel:

1. Update `APP_BASE_URL` and `STEAM_REALM` to the custom domain.
2. Add the custom domain Google OAuth redirect URI.
3. Redeploy.
