import type { Team } from './types'

/**
 * Convert a flag emoji (two Unicode regional-indicator symbols) into an
 * ISO 3166-1 alpha-2 country code, e.g. "🇲🇽" -> "mx".
 *
 * Regional indicators run from U+1F1E6 ("A") to U+1F1FF ("Z"), so each
 * codepoint maps back to a letter by offsetting from U+1F1E6.
 */
export function flagEmojiToIso(flag: string): string | null {
  const codepoints = Array.from(flag).map((c) => c.codePointAt(0) ?? 0)
  const indicators = codepoints.filter((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff)
  if (indicators.length < 2) return null
  return indicators
    .slice(0, 2)
    .map((cp) => String.fromCharCode(cp - 0x1f1e6 + 0x61))
    .join('')
}

/** Build a flagcdn.com SVG URL for a team, derived from its flag emoji. */
export function flagUrl(team: Pick<Team, 'flag_icon'>): string | null {
  const iso = flagEmojiToIso(team.flag_icon)
  return iso ? `https://flagcdn.com/${iso}.svg` : null
}

/** Index teams by every name they might be referenced under. */
export function indexTeamsByName(teams: Team[]): Map<string, Team> {
  const map = new Map<string, Team>()
  for (const team of teams) {
    map.set(team.name, team)
    if (team.name_normalised) map.set(team.name_normalised, team)
  }
  return map
}

const MATCHDAY_RE = /^Matchday\s+(\d+)$/

const KNOCKOUT_ORDER: Record<string, number> = {
  'Round of 32': 1000,
  'Round of 16': 1001,
  'Quarter-final': 1002,
  'Semi-final': 1003,
  'Match for third place': 1004,
  Final: 1005,
}

/** Sort key that keeps group-stage matchdays in order, then knockout rounds. */
export function roundOrder(round: string): number {
  const md = MATCHDAY_RE.exec(round)
  if (md) return Number(md[1])
  return KNOCKOUT_ORDER[round] ?? 9999
}

/** Group an array into a Map keyed by the result of `keyFn`, preserving order. */
export function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    const bucket = map.get(key)
    if (bucket) bucket.push(item)
    else map.set(key, [item])
  }
  return map
}

/** Format an ISO date (YYYY-MM-DD) as e.g. "Thu 11 Jun". */
export function formatMatchDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}
