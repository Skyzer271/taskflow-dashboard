# Deployment Guide

This project can be deployed in several ways:

1. **Fly.io** (recommended for free persistent storage): backend + frontend + SQLite volume.
2. **Render**: backend + frontend, but the free plan has no persistent storage.
3. **Split**: backend on Render/Railway/Fly + frontend on GitHub Pages / Vercel.

---

## Option 1: Deploy everything to Fly.io (recommended)

Fly.io’s free tier includes enough resources for this app and supports
**persistent volumes**, so SQLite data survives restarts and deploys.

### Prerequisites

- [Fly.io account](https://fly.io/app/signup)
- [flyctl](https://fly.io/docs/hands-on/install-flyctl/) installed and logged in:

```bash
fly auth login
```

### 1. Launch the app

From the project root run:

```bash
fly launch
```

- `fly launch` reads `fly.toml` and detects the `Dockerfile`.
- When asked, confirm creation of the `taskflow_data` volume (1 GB) mounted at `/data`.
- Choose not to create a separate Postgres database (SQLite is used instead).

### 2. Set environment variables

```bash
fly secrets set JWT_SECRET="$(openssl rand -base64 32)"
fly secrets set ADMIN_EMAIL="admin@taskflow.local"
fly secrets set ADMIN_PASSWORD="your-strong-admin-password"
```

### 3. Deploy

```bash
fly deploy
```

After a successful deploy you get a public URL like:

```text
https://taskflow-dashboard.fly.dev
```

### 4. First login

Open the URL and sign in with:

```text
Email:    <ADMIN_EMAIL>
Password: <ADMIN_PASSWORD>
```

### 5. Automatic deploys on every push (optional)

The repository includes `.github/workflows/fly.yml`. To enable automatic
deployments when you push to `main`:

1. Create a Fly.io API token:

   ```bash
   fly tokens create deploy -x 999999h
   ```

2. Add it as a GitHub repository secret named `FLY_API_TOKEN`:

   GitHub repo → **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret** → Name: `FLY_API_TOKEN`, Value: your token.

3. Push to `main`. GitHub Actions will run `flyctl deploy --remote-only`
   automatically.

### Important notes

- The first deploy also runs `npm run server:seed`, which creates the default
  admin account if it does not exist yet.
- The SQLite database is stored on the Fly.io volume at `/data/taskflow.db`.
- If the app name `taskflow-dashboard` is already taken, change `app` in
  `fly.toml` to something unique, e.g. `taskflow-dashboard-skyzer`.
- Deployments use `--ha=false` because a single Fly Volume can only be attached
  to one machine.
- If you ever need to reset the volume, run `fly volume destroy taskflow_data`
  and recreate it during the next deploy.

---

## Option 2: Deploy everything to Render

This is the easiest setup, but Render’s free plan does **not** offer persistent
storage. The database is reset on every deploy/restart.

See `render.yaml` for the Blueprint configuration. The steps are:

1. Push the project to GitHub.
2. In Render: **New + → Web Service** → connect the repository.
3. Render uses the settings from `render.yaml`.
4. After deploy, sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

For persistent SQLite storage on Render you need to upgrade to a paid plan and
keep the disk section in `render.yaml`.

---

## Option 3: Split backend and frontend

Use this if you want the React app on GitHub Pages / Vercel and only the API
on Fly.io/Render/Railway.

### Backend

- Build command: `npm ci && npm run server:seed`
- Start command: `npm start`
- Set `ALLOWED_ORIGINS` to your frontend URL.

### Frontend

- Build command: `npm run build`
- Output directory: `dist`
- Set the environment variable `VITE_API_URL` to your backend URL, e.g.:

```text
VITE_API_URL=https://taskflow-dashboard.fly.dev
```

The existing files already support this:

- `.github/workflows/pages.yml` deploys to GitHub Pages.
- `vercel.json` configures Vercel.

---

## Useful commands

```bash
# Build the production frontend locally
npm run build

# Run the production server locally (serves dist/)
npm start

# (Re-)create the default admin account
npm run server:seed
```

---

## Notes

- The backend serves static files only when `NODE_ENV=production`.
- When `VITE_API_URL` is empty, the frontend calls API paths relative to the
  current origin (`/api/...`), which is perfect for the all-in-one deployments
  on Fly.io or Render.
