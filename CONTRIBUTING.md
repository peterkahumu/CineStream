# Contributing to CinemaPhora

Thanks for pitching in. This page covers how to file an issue and how to get a change
merged. For architecture and setup, read [DEVELOPER.md](./DEVELOPER.md) first.

---

## Filing an Issue

### Which template should I use?

Ask yourself: **"Did this ever work correctly?"**

- **YES, but it's broken now** → **🐛 Bug Fix**
- **NO, I want something new** → **✨ Enhancement**
- **I have an idea but need discussion** → **💡 Recommendation**
- **None of the above** → **📄 General**

[View the full selection guide →](https://github.com/peterkahumu/Cinestream/wiki/Issue-Selection-Guide)

### Before filing a bug

- Note **which streaming server** you were on. Servers badged *Basic* in the player don't
  emit progress events, so "my progress wasn't saved" on one of those is expected
  behaviour, not a bug.
- Say whether you were **signed in or a guest** — the sync paths are completely different.
- Include the browser/platform, and whether you were in the PWA, the Android app, or a
  normal browser tab.

---

## Making a Change

### Workflow

This project is **PR-based**. Don't push to `master`.

```bash
git checkout -b fix/short-description     # or feat/… , chore/… , docs/…
# …work…
npm run typecheck && npm test && npx eslint .
git commit -m "fix: resolve next episode from TMDB airing data"
git push -u origin fix/short-description
```

A PR into `master` is opened automatically by `.github/workflows/auto-pr.yml` for any
non-master push. CI then runs `cf-typegen → typecheck → build`.

### Before you open a PR

| Check | Command |
|---|---|
| Types | `npm run typecheck` |
| Logic verification scripts | `npm test` |
| Lint | `npx eslint .` |
| Production build | `npm run build` |

CI doesn't currently run the tests or the linter, so running them locally matters.

### Commit messages

One line, conventional-commit style (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
Describe the outcome, not the diff. No multi-paragraph bodies.

### Database changes

This project uses **`drizzle-kit push` (schema diffing), never migration files.** Edit
`lib/db/schema.ts`, then run `npm run db:push`. Do not introduce
`drizzle-kit generate`-based migrations — they assume an empty database and would conflict
with tables that already exist in production.

Any column storing `Date.now()` must be `bigint("col", { mode: "number" })`, not `integer`
— see [DEVELOPER.md → Gotchas](./DEVELOPER.md#-gotchas).

### Code conventions

The non-negotiables, in full at
[DEVELOPER.md → Code Quality Rules](./DEVELOPER.md#-code-quality-rules):

1. No function definitions inside `useEffect` — calls only.
2. Server pages orchestrate; interactive logic goes in a sibling `*Client.tsx`.
3. **CSS Modules only.** No inline `style={{}}`, no Tailwind.
4. Pure logic that both the client and a route handler need (`lib/episodes.ts`,
   `lib/stats.ts`) stays free of browser APIs and DB access — and should come with a
   `scripts/verify-*.ts` script.
5. Plain comments. No decorative ASCII-line banner comments.
6. Never accept a provider `postMessage` without validating `event.origin`.

### Documentation

If your change alters behaviour a user would notice, update [USER.md](./USER.md). If it
alters architecture, environment variables, or the data model, update
[DEVELOPER.md](./DEVELOPER.md). Shipping something from the roadmap? Move it in
[coming_soon.md](./coming_soon.md), and clear the corresponding item from
[planning.md](./planning.md).
