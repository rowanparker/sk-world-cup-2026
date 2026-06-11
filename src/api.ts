import type {
  Match,
  MatchesFile,
  Stadium,
  StadiumsFile,
  SweepEntry,
  SweepRow,
  Team,
  WorldCupData,
} from './types'
import { fetchBackupResults, mergeBackupScores } from './backup'
import { indexTeamsByName } from './utils'

/** Source data lives in the openfootball/worldcup.json repo (2026 folder). */
const SOURCES = {
  teams:
    'https://github.com/openfootball/worldcup.json/blob/master/2026/worldcup.teams.json',
  stadiums:
    'https://github.com/openfootball/worldcup.json/blob/master/2026/worldcup.stadiums.json',
  matches:
    'https://github.com/openfootball/worldcup.json/blob/master/2026/worldcup.json',
  qualiPlayoffs:
    'https://github.com/openfootball/worldcup.json/blob/master/2026/worldcup.quali_playoffs.json',
} as const

/**
 * GitHub "blob" URLs render an HTML page; the raw JSON is served from
 * raw.githubusercontent.com (which sends permissive CORS headers).
 */
export function toRawUrl(blobUrl: string): string {
  return blobUrl
    .replace('https://github.com/', 'https://raw.githubusercontent.com/')
    .replace('/blob/', '/')
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(toRawUrl(url), { signal })
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

/** Join the sweep entries to their Team records, skipping any unknown names. */
export function buildSweep(entries: SweepEntry[], teams: Team[]): SweepRow[] {
  const byName = indexTeamsByName(teams)
  const rows: SweepRow[] = []
  for (const entry of entries) {
    const team = byName.get(entry.team)
    if (team) rows.push({ person: entry.person, team })
    else console.warn(`No team found for sweep entry "${entry.team}"`)
  }
  return rows
}

export async function loadWorldCupData(signal?: AbortSignal): Promise<WorldCupData> {
  const [teams, stadiumsFile, matchesFile, qualiFile, sweepEntries, backup] =
    await Promise.all([
      fetchJson<Team[]>(SOURCES.teams, signal),
      fetchJson<StadiumsFile>(SOURCES.stadiums, signal),
      fetchJson<MatchesFile>(SOURCES.matches, signal),
      fetchJson<MatchesFile>(SOURCES.qualiPlayoffs, signal),
      fetchSweepEntries(signal),
      // Backup live-results feed; resolves to [] if it's unavailable.
      fetchBackupResults(signal),
    ])

  return {
    teams,
    stadiums: stadiumsFile.stadiums as Stadium[],
    // Fill any scores openfootball hasn't published yet from the backup source.
    matches: mergeBackupScores(matchesFile.matches as Match[], backup),
    qualiPlayoffs: qualiFile.matches as Match[],
    sweep: buildSweep(sweepEntries, teams),
  }
}

async function fetchSweepEntries(signal?: AbortSignal): Promise<SweepEntry[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}people.json`, { signal })
  if (!res.ok) throw new Error(`Failed to load people.json: ${res.status}`)
  return (await res.json()) as SweepEntry[]
}
