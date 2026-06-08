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

/**
 * Filename-safe slug for a person, used to locate their avatar in
 * `public/people/<slug>.png` (e.g. "Fleur & Galina" -> "fleur-galina").
 */
export function personSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Public URL for a person's avatar image (a per-person copy of the placeholder). */
export function avatarUrl(name: string): string {
  return `${import.meta.env.BASE_URL}people/${personSlug(name)}.png`
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

/** The sweep is run from Melbourne, so all kick-off times are shown in this zone. */
export const MELBOURNE_TZ = 'Australia/Melbourne'

/**
 * Resolve a match's kick-off to an absolute instant.
 *
 * The source data stores `time` as a wall-clock plus a UTC offset, e.g.
 * "13:00 UTC-6" (and occasionally with offset minutes, "12:30 UTC-3:30").
 * Returns null when the time can't be parsed.
 */
export function matchInstant(iso: string, time: string): Date | null {
  const m = time.match(/^(\d{1,2}):(\d{2})\s*UTC([+-])(\d{1,2})(?::?(\d{2}))?$/)
  if (!m) return null
  const [, hh, mm, sign, offH, offM = '0'] = m
  const offsetMinutes =
    (sign === '-' ? -1 : 1) * (Number(offH) * 60 + Number(offM))
  const wallClockUtc = Date.parse(
    `${iso}T${hh.padStart(2, '0')}:${mm}:00Z`,
  )
  if (Number.isNaN(wallClockUtc)) return null
  // UTC instant = the wall-clock reading minus the venue's offset from UTC.
  return new Date(wallClockUtc - offsetMinutes * 60_000)
}

/**
 * Format an ISO date (YYYY-MM-DD) as e.g. "Thu 11 Jun". When `time` is given,
 * the date is resolved to the equivalent Melbourne day (a late kick-off abroad
 * can fall on the next day here).
 */
export function formatMatchDate(iso: string, time?: string): string {
  const instant = time ? matchInstant(iso, time) : null
  const date = instant ?? new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: instant ? MELBOURNE_TZ : 'UTC',
  })
}

/** Format a match kick-off as a 24-hour Melbourne time, e.g. "05:00". */
export function formatMatchTime(iso: string, time: string): string {
  const instant = matchInstant(iso, time)
  if (!instant) return time
  return instant.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: MELBOURNE_TZ,
  })
}
