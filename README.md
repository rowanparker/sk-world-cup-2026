# Sidekicker World Cup 2026 Sweeps

A React + TypeScript single-page app that tracks the Sidekicker office sweep for
the 2026 FIFA World Cup — who drew which nation, and the full match schedule.

## Stack

- [Vite](https://vitejs.dev/) + React 18 + TypeScript
- [Vitest](https://vitest.dev/) + Testing Library for tests

## Data

On load the app fetches the official open data from
[`openfootball/worldcup.json`](https://github.com/openfootball/worldcup.json)
(teams, stadiums, fixtures and qualifying play-offs). GitHub `blob` URLs are
rewritten to `raw.githubusercontent.com` at fetch time.

openfootball is the primary feed but is updated by hand, so a just-finished
match can sit without a score for a while. As a backup the app also fetches
finished results from [TheSportsDB](https://www.thesportsdb.com/free_sports_api)
(FIFA World Cup league `4429`, free test key `3`, no token, CORS-enabled) and
fills in **only** the scores openfootball is still missing — it never overrides
openfootball, which additionally carries extra-time and penalty breakdowns.
Results are matched to fixtures by team pairing (names normalised across the two
sources) and kick-off date. If the backup is unavailable the app degrades
silently. See [`src/backup.ts`](src/backup.ts).

The sweep itself — each person and the nation they drew — lives in
[`public/people.json`](public/people.json). Team names there are reconciled to
the names used in the openfootball data (e.g. `USA`, `DR Congo`,
`Bosnia & Herzegovina`).

> The original `import.md` source list is git-ignored and not committed.

## Scripts

```bash
npm install      # install dependencies
npm run dev      # start the dev server
npm test         # run the test suite once
npm run build    # typecheck + production build
npm run typecheck
```
