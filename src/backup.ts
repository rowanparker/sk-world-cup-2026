import type { Match } from './types'
import { normaliseTeamName } from './utils'

/**
 * Backup live-results source: TheSportsDB's free, public-domain football API.
 *
 * openfootball is our primary feed but is updated by hand (roughly once a day),
 * so freshly-played matches can sit without a score for hours. TheSportsDB
 * carries the same fixtures keyed by FIFA World Cup league `4429`, requires no
 * API token (the shared free test key `3`), and sends `Access-Control-Allow-
 * Origin: *` so it works straight from the browser. We only use it to fill in
 * scores openfootball is still missing — never to override what it already has,
 * since openfootball additionally records extra-time and penalty breakdowns.
 */
const BACKUP_RESULTS_URL =
  'https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4429&s=2026'

/** A single event as returned by TheSportsDB's `eventsseason` endpoint. */
interface SportsDbEvent {
  strHomeTeam: string | null
  strAwayTeam: string | null
  intHomeScore: string | null
  intAwayScore: string | null
  strStatus: string | null
  dateEvent: string | null
}

interface SportsDbResponse {
  events: SportsDbEvent[] | null
}

/** TheSportsDB statuses that mean the match is over and the score is final. */
const FINISHED_STATUSES = new Set([
  'FT',
  'AET',
  'PEN',
  'AP',
  'AWD',
  'FINISHED',
  'MATCH FINISHED',
])

/** A finished result resolved to home/away goals, ready to fill a Match. */
interface BackupResult {
  date: string
  home: string
  away: string
  homeGoals: number
  awayGoals: number
}

/** Stable, order-independent key for the pairing of two teams. */
function pairKey(a: string, b: string): string {
  return [normaliseTeamName(a), normaliseTeamName(b)].sort().join('|')
}

/** Difference between two ISO dates (YYYY-MM-DD) in whole days, or Infinity. */
function dayGap(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00Z`)
  const tb = Date.parse(`${b}T00:00:00Z`)
  if (Number.isNaN(ta) || Number.isNaN(tb)) return Infinity
  return Math.abs(ta - tb) / 86_400_000
}

/**
 * Fetch finished results from the backup source. Resolves to an empty array on
 * any failure (network, CORS, schema) so a flaky backup can never break the
 * primary load.
 */
export async function fetchBackupResults(
  signal?: AbortSignal,
): Promise<BackupResult[]> {
  try {
    const res = await fetch(BACKUP_RESULTS_URL, { signal })
    if (!res.ok) return []
    const data = (await res.json()) as SportsDbResponse
    const events = data.events ?? []
    const results: BackupResult[] = []
    for (const e of events) {
      const status = (e.strStatus ?? '').toUpperCase().trim()
      if (!FINISHED_STATUSES.has(status)) continue
      if (!e.strHomeTeam || !e.strAwayTeam || !e.dateEvent) continue
      const homeGoals = Number(e.intHomeScore)
      const awayGoals = Number(e.intAwayScore)
      if (
        e.intHomeScore == null ||
        e.intAwayScore == null ||
        Number.isNaN(homeGoals) ||
        Number.isNaN(awayGoals)
      ) {
        continue
      }
      results.push({
        date: e.dateEvent,
        home: e.strHomeTeam,
        away: e.strAwayTeam,
        homeGoals,
        awayGoals,
      })
    }
    return results
  } catch {
    return []
  }
}

/**
 * Return a copy of `matches` with backup scores merged in. Only matches that
 * have no score yet are touched; a backup result is matched to a fixture by its
 * team pairing and a kick-off date within a day (to absorb timezone drift).
 */
export function mergeBackupScores(
  matches: Match[],
  backup: BackupResult[],
): Match[] {
  if (backup.length === 0) return matches

  // Group backup results by team pairing; a given pair can meet more than once
  // (group stage then knockout), so disambiguate by date at lookup time.
  const byPair = new Map<string, BackupResult[]>()
  for (const r of backup) {
    const key = pairKey(r.home, r.away)
    const bucket = byPair.get(key)
    if (bucket) bucket.push(r)
    else byPair.set(key, [r])
  }

  let filled = 0
  const merged = matches.map((match) => {
    if (match.score?.ft) return match
    const candidates = byPair.get(pairKey(match.team1, match.team2))
    if (!candidates) return match

    const hit = candidates.find((r) => dayGap(r.date, match.date) <= 1)
    if (!hit) return match

    // Orient the backup's home/away goals onto this fixture's team1/team2.
    const team1IsHome =
      normaliseTeamName(match.team1) === normaliseTeamName(hit.home)
    const ft: [number, number] = team1IsHome
      ? [hit.homeGoals, hit.awayGoals]
      : [hit.awayGoals, hit.homeGoals]

    filled += 1
    return { ...match, score: { ft } }
  })

  if (filled > 0) {
    console.info(`Filled ${filled} score(s) from the backup results source.`)
  }
  return merged
}
