# ConflictWatch

An open-source, round-the-clock conflict monitor. A world map shows curated pins for
active conflicts (dark red), potential flashpoints (orange), and civil unrest (yellow),
grouped by region in a sidebar. Every pin aggregates live news from credible open
sources, cross-checked by a corroboration rule, with linked entities, live OSINT maps,
broadcaster streams, and a 53-language interface.

## How it works

- **Sources** — the server polls RSS feeds from 8 publishers every 5 minutes: BBC News
  (world + 5 regional feeds), Al Jazeera, The Guardian, UN News, Deutsche Welle,
  France 24, ReliefWeb (UN OCHA), Dawn, and The Diplomat. Feeds from the same publisher
  share one source name so they never count twice for corroboration.
- **Relevance filter** — an article only attaches to a conflict if it matches the
  conflict's keywords *and* contains security/military/diplomatic/humanitarian/unrest
  terms. General news that merely mentions a country is dropped.
- **Corroboration** — a conflict is marked *corroborated* only when 2+ independent
  sources report on it within 48 hours.
- **Auto-detected unrest** — unrest-tagged reporting clustering on a country without a
  curated pin surfaces as a dashed suggestion pin: blue while single-source, green once
  corroborated. Suggestions are never silently promoted to curated pins.
- **Linked entities** — companies/organisations tied to each conflict, restricted to
  what public sanctions lists (OFAC/EU/UK/UN) and official records document, each with
  a connection tag (weapons deals, monetary support, …) and a verification source link.
- **Languages** — 9 fully hand-translated UI languages (en/es/fr/pt/de/ar/ja/ko/zh,
  with RTL support) plus 44 more where articles open machine-translated via Google
  Translate while the UI stays in English.

## Running locally

No dependencies — Python 3 standard library only.

```bash
python3 server.py
```

Then open http://localhost:4173.

## Editing content (no code required)

All curated content lives in `conflicts.json`. Each entry has: name, country, lat/lng,
region, status (`active` / `potential` / `unrest`), keywords, and optionally an
assessment link, live-coverage links, and entities. Edit the file, restart the server,
done. Keep entity claims strictly to what the cited source documents.

## Deploying / going live

The app is one Python process — it runs anywhere. Recommended: **Render** (or
Railway/Fly.io, equivalent workflow):

1. Push this repository to GitHub.
2. On render.com: New → Web Service → connect the repo.
3. Start command: `python3 server.py`. Add environment variable `HOST=0.0.0.0`
   (Render sets `PORT` automatically; the server reads both).
4. Every subsequent `git push` deploys the update automatically — this is how you
   edit or add features after going live. Roll back to any previous commit if a
   deploy misbehaves.

## Updating after launch

The workflow never changes: edit → test locally → commit → push (auto-deploys).
News data refreshes itself every 5 minutes; content edits are `conflicts.json`
changes; features are code changes. Nothing about being live prevents updates.

## Honest limitations

- Corroboration is a proxy for verification, not proof — no automated system truly
  verifies conflict claims.
- Active/potential/unrest designations are editorially curated; the linked CFR /
  Crisis Group / ACLED assessments are the live authority.
- Machine-translated articles are imperfect; the original is always one click away.
- Mainstream feeds under-report small conflicts; quiet pins are honest, not broken.
  ACLED's API (free key required) is the best upgrade path for small-scale violence
  data.
