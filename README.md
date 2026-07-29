# 30-Day Check Sheet

New-hire training check sheet — 30 days of milestones, a policy pack, station
procedures, trainee initials and manager sign-offs. Rebuilt off Base44 as a
static PWA on GitHub Pages with a Cloudflare Worker + D1 database behind it, so
the app has no vendor lock-in and no subscription.

- **Live app:** https://thomasg42.github.io/thirty-day-training/
- **API:** `https://thirty-day-training-sync.forevergoldai.workers.dev`

## How it is put together

| Piece | What it does |
| --- | --- |
| `docs/` | The whole front end. GitHub Pages serves this folder directly — no build step. |
| `docs/data/curriculum.js` | The curriculum, extracted verbatim from the Base44 app. Task arrays are the source of truth for structure; wording is overridable in Admin. |
| `docs/cloud.js` | Cloud-first data layer. D1 is the ledger; localStorage is a read-through cache plus an outbox for offline writes. |
| `sync-worker/index.ts` | Cloudflare Worker API — auth, employee records, settings. |
| `sync-worker/migrations/` | D1 schema. Apply with `wrangler d1 migrations apply`. |

## Two codes, no credentials in this repo

Both are set once from the app's own first-run screen and stored server-side as
salted SHA-256 hashes. Neither value exists anywhere in this repository.

- **Staff access code** — everyone on the team. Opens the check sheet, ticks
  milestones, enters initials, watches linked training.
- **Admin PIN** — managers. Everything above, plus manager sign-off boxes, the
  roster, training links, branding and code rotation.

Rotate either from **Admin → Codes** using the current admin PIN. A forgotten
admin PIN can only be cleared from the Cloudflare dashboard by deleting the row
from the `credentials` table in the `thirty-day-training-sync` D1 database.

## Deploying

```bash
# front end — pushing to main republishes GitHub Pages automatically
git push

# backend
npx wrangler d1 migrations apply thirty-day-training-sync --remote
npx wrangler deploy
```

**Bump `CACHE` in `docs/sw.js` on every front-end deploy.** A stale service
worker cache is the number-one cause of "I don't see the change on my phone".

## Known gap carried over from Base44

The Base44 export contained the entity schemas, the curriculum and the admin
auth file — but **not the video and policy URLs**, because those lived in
Base44's own `AppSettings` database rather than in code. Every link slot in this
rebuild is therefore empty until filled in.

Pull the URLs out of the live Base44 app before cancelling it, then either paste
them one at a time in **Admin → Training links** or bulk-import them there as
JSON:

```json
{ "p1-1": "https://youtu.be/…", "policy-silver-bowl": "https://…" }
```

Admin → Training links → *Export JSON* gives you the full list of expected keys.

Also note: only the policy-pack **task IDs** survived the export, not their
labels — the components that rendered them were never captured. The labels in
`curriculum.js` are reconstructed from the IDs and marked as such. Correct them
in **Admin → Curriculum wording** rather than editing the file.

## Rebranding

The sheet ships brand-agnostic. **Admin → Branding** switches name and colours
across the app for everyone; **Admin → Curriculum wording** overrides any task
title or description. That combination moves the sheet onto another restaurant's
stations without a code change or a redeploy.
