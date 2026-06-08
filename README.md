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
