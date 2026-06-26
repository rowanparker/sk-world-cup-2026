import type { Match, SweepRow, Team } from './types'

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

/**
 * Aliases mapping a normalised team name to the canonical normalised form used
 * elsewhere, so the same nation matches across data sources that spell it
 * differently (e.g. "Korea Republic" vs "South Korea").
 */
const TEAM_NAME_ALIASES: Record<string, string> = {
  'korea republic': 'south korea',
  'ir iran': 'iran',
  'cote d ivoire': 'ivory coast',
  'czechia': 'czech republic',
  'congo dr': 'dr congo',
  'usa': 'united states',
  'united states of america': 'united states',
}

/**
 * Reduce a team name to a comparison key: lower-cased, diacritics stripped, and
 * every run of non-alphanumeric characters collapsed to a single space. This
 * makes "Bosnia & Herzegovina" and "Bosnia-Herzegovina" compare equal, then a
 * small alias table reconciles names that differ by more than punctuation.
 */
export function normaliseTeamName(name: string): string {
  const key = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return TEAM_NAME_ALIASES[key] ?? key
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

/** True for the knockout-stage rounds (everything after the group matchdays). */
export function isKnockoutRound(round: string): boolean {
  return round in KNOCKOUT_ORDER
}

/** Knockout rounds in bracket order, left (first) to right (final). */
const BRACKET_SEQUENCE = [
  'Round of 32',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Final',
] as const

const FEEDER_REF_RE = /^[WL](\d+)$/

/**
 * If a knockout side is a placeholder like "W74" (winner of match 74) or
 * "L101" (loser of match 101), return the match number it feeds from; else null.
 */
export function feederMatchNum(ref: string): number | null {
  const m = FEEDER_REF_RE.exec(ref)
  return m ? Number(m[1]) : null
}

export interface BracketRound {
  round: string
  matches: Match[]
}

export interface Bracket {
  /** Rounds left-to-right: Round of 32 → … → Final (only those present). */
  rounds: BracketRound[]
  /** The third-place play-off sits outside the main tree, or null if absent. */
  thirdPlace: Match | null
}

/**
 * Arrange the knockout matches into a bracket. Within each round the matches are
 * ordered top-to-bottom so each one sits between the two it feeds from: a
 * pre-order walk from the Final stamps every match with a visit index, and each
 * round is then sorted by that index.
 */
export function buildBracket(matches: Match[]): Bracket {
  const knockout = matches.filter((m) => isKnockoutRound(m.round))
  const byNum = new Map<number, Match>()
  for (const m of knockout) if (m.num != null) byNum.set(m.num, m)

  const order = new Map<number, number>()
  let counter = 0
  const visit = (num: number | null | undefined) => {
    if (num == null) return
    const match = byNum.get(num)
    if (!match || order.has(num)) return
    order.set(num, counter++)
    visit(feederMatchNum(match.team1))
    visit(feederMatchNum(match.team2))
  }
  const final = knockout.find((m) => m.round === 'Final')
  visit(final?.num)
  // Stamp any match not reachable from the Final so nothing is dropped.
  for (const m of knockout) if (m.num != null && !order.has(m.num)) order.set(m.num, counter++)

  const orderOf = (m: Match) => order.get(m.num ?? -1) ?? Number.MAX_SAFE_INTEGER

  const rounds = BRACKET_SEQUENCE.map((round) => ({
    round,
    matches: knockout
      .filter((m) => m.round === round)
      .sort((a, b) => orderOf(a) - orderOf(b)),
  })).filter((r) => r.matches.length > 0)

  const thirdPlace =
    knockout.find((m) => m.round === 'Match for third place') ?? null

  return { rounds, thirdPlace }
}

export interface SweepStanding {
  person: string
  team: Team
  /** Group-stage matches played. */
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  /** Group-stage points (3 / 1 / 0). */
  points: number
  /** Knockout matches won (each win = one round survived). */
  knockoutWins: number
}

function emptyStanding(person: string, team: Team): SweepStanding {
  return {
    person,
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
    knockoutWins: 0,
  }
}

/**
 * Build a performance table for the sweep teams from the matches played so far.
 * Group-stage results feed the usual points/goal tallies; knockout results only
 * count survived rounds (`knockoutWins`). Rows are returned best-first, ranked by
 * knockout progression, then group points, goal difference and goals scored.
 */
export function computeSweepStandings(
  matches: Match[],
  sweep: SweepRow[],
): SweepStanding[] {
  const byPerson = new Map<string, SweepStanding>()
  const personByTeamName = new Map<string, string>()
  for (const row of sweep) {
    byPerson.set(row.person, emptyStanding(row.person, row.team))
    personByTeamName.set(row.team.name, row.person)
    if (row.team.name_normalised)
      personByTeamName.set(row.team.name_normalised, row.person)
  }

  const apply = (
    s: SweepStanding,
    gf: number,
    ga: number,
    won: boolean,
    drawn: boolean,
    knockout: boolean,
  ) => {
    if (knockout) {
      if (won) s.knockoutWins += 1
      return
    }
    s.played += 1
    s.goalsFor += gf
    s.goalsAgainst += ga
    s.goalDiff = s.goalsFor - s.goalsAgainst
    if (won) {
      s.won += 1
      s.points += 3
    } else if (drawn) {
      s.drawn += 1
      s.points += 1
    } else {
      s.lost += 1
    }
  }

  for (const match of matches) {
    const result = matchResult(match)
    if (!result) continue
    const knockout = isKnockoutRound(match.round)
    const [g1, g2] = result.ft
    const p1 = personByTeamName.get(match.team1)
    const p2 = personByTeamName.get(match.team2)
    if (p1)
      apply(byPerson.get(p1)!, g1, g2, result.winner === 1, result.winner === null, knockout)
    if (p2)
      apply(byPerson.get(p2)!, g2, g1, result.winner === 2, result.winner === null, knockout)
  }

  return [...byPerson.values()].sort(
    (a, b) =>
      b.knockoutWins - a.knockoutWins ||
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.person.localeCompare(b.person),
  )
}

/**
 * Best estimate of who is currently last in the sweep — the worst-ranked team in
 * {@link computeSweepStandings}. Returns null until at least one match has been
 * played (before then there's nothing to estimate from).
 */
export function estimateLastPlace(
  matches: Match[],
  sweep: SweepRow[],
): SweepStanding | null {
  const standings = computeSweepStandings(matches, sweep)
  const anyPlayed = standings.some((s) => s.played > 0 || s.knockoutWins > 0)
  if (!anyPlayed) return null
  return standings[standings.length - 1]
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

export interface MatchResult {
  /** Full-time goals as shown to the user, e.g. [2, 1]. */
  ft: [number, number]
  /** 1 if team1 won, 2 if team2 won, null for a draw. */
  winner: 1 | 2 | null
  /** Extra context like "a.e.t." or "4–2 pens", when the match went past 90'. */
  detail: string | null
}

/**
 * Resolve a completed match's score into a displayable result. A match is
 * considered finished only when it carries a full-time (`ft`) score; extra time
 * (`et`) and penalties (`p`) decide the winner when the 90 minutes were level.
 * Returns null for matches that haven't been played.
 */
export function matchResult(match: Match): MatchResult | null {
  const { score } = match
  if (!score?.ft) return null
  const ft = score.ft

  if (score.p) {
    const [p1, p2] = score.p
    return {
      ft,
      winner: p1 > p2 ? 1 : p1 < p2 ? 2 : null,
      detail: `${p1}–${p2} pens`,
    }
  }
  if (score.et) {
    const [e1, e2] = score.et
    return {
      ft,
      winner: e1 > e2 ? 1 : e1 < e2 ? 2 : null,
      detail: 'a.e.t.',
    }
  }
  const [f1, f2] = ft
  return { ft, winner: f1 > f2 ? 1 : f1 < f2 ? 2 : null, detail: null }
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
