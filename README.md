# Appointment booking app (Render-ready)

Minimal full‑stack example. Slots appear on button click, user picks time, accepts terms, enters data, submits. Customer and provider get emails with confirmation links. After **both** confirm, the slot is removed from the dropdown.

## Local run

```bash
npm i
npm run seed
cp .env.example .env  # edit SMTP + emails
npm run dev
```

Open http://localhost:3000

## Deploy to Render

1. Push this repo to GitHub.
2. Use **Blueprints** and this `render.yaml` file (or click **New > Blueprint** and point at the repo).
3. During creation, set secret env vars prompted by Render (SMTP_* and emails).

### Notes
- The SQLite file is on a **persistent disk** at `/data/data.sqlite`. Change with `DB_PATH`.
- `BASE_URL` is auto‑inferred from request headers. Override via env if needed.
- Health check: `/api/health`.
- Attach a paid **persistent disk** to preserve the SQLite file across deploys.
