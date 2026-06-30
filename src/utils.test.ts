import { describe, expect, it } from 'vitest'
import {
  buildBracket,
  computeSweepStandings,
  estimateLastPlace,
  feederMatchNum,
  flagEmojiToIso,
  flagUrl,
  formatMatchDate,
  formatMatchTime,
  groupBy,
  indexTeamsByName,
  isKnockoutRound,
  matchResult,
  normaliseTeamName,
  personSlug,
  resolveFeeder,
  roundOrder,
} from './utils'
import type { Match, SweepRow, Team } from './types'

const team = (over: Partial<Team>): Team => ({
  name: 'Mexico',
  continent: 'North America',
  flag_icon: '🇲🇽',
  flag_unicode: '',
  fifa_code: 'MEX',
  group: 'A',
  confed: 'CONCACAF',
  ...over,
})

describe('flagEmojiToIso', () => {
  it('converts a flag emoji to its ISO 3166-1 alpha-2 code', () => {
    expect(flagEmojiToIso('🇲🇽')).toBe('mx')
    expect(flagEmojiToIso('🇯🇵')).toBe('jp')
    expect(flagEmojiToIso('🇬🇧')).toBe('gb')
  })

  it('returns null when there are not two regional indicators', () => {
    expect(flagEmojiToIso('')).toBeNull()
    expect(flagEmojiToIso('abc')).toBeNull()
  })
})

describe('matchResult', () => {
  const match = (score?: Match['score']): Match => ({
    round: 'Matchday 1',
    date: '2026-06-11',
    time: '13:00 UTC-6',
    team1: 'Mexico',
    team2: 'Japan',
    ground: 'Estadio Azteca',
    score,
  })

  it('returns null for matches that have not been played', () => {
    expect(matchResult(match())).toBeNull()
    expect(matchResult(match({ ft: undefined }))).toBeNull()
  })

  it('picks the winner from the full-time score', () => {
    expect(matchResult(match({ ft: [2, 1] }))).toEqual({
      ft: [2, 1],
      winner: 1,
      detail: null,
    })
    expect(matchResult(match({ ft: [0, 3] }))?.winner).toBe(2)
  })

  it('reports a level full-time score as a draw', () => {
    expect(matchResult(match({ ft: [1, 1] }))).toEqual({
      ft: [1, 1],
      winner: null,
      detail: null,
    })
  })

  it('uses extra time to break a tie', () => {
    expect(matchResult(match({ ft: [1, 1], et: [2, 1] }))).toEqual({
      ft: [1, 1],
      winner: 1,
      detail: 'a.e.t.',
    })
  })

  it('uses penalties when still level after extra time', () => {
    expect(
      matchResult(match({ ft: [1, 1], et: [1, 1], p: [3, 4] })),
    ).toEqual({
      ft: [1, 1],
      winner: 2,
      detail: '3–4 pens',
    })
  })
})

describe('normaliseTeamName', () => {
  it('collapses punctuation so spelling variants compare equal', () => {
    expect(normaliseTeamName('Bosnia & Herzegovina')).toBe(
      normaliseTeamName('Bosnia-Herzegovina'),
    )
  })

  it('strips diacritics', () => {
    expect(normaliseTeamName("Côte d'Ivoire")).toBe('ivory coast')
  })

  it('reconciles cross-source aliases to one canonical name', () => {
    expect(normaliseTeamName('Korea Republic')).toBe('south korea')
    expect(normaliseTeamName('IR Iran')).toBe('iran')
    expect(normaliseTeamName('Czechia')).toBe('czech republic')
  })
})

describe('personSlug', () => {
  it('lowercases and hyphenates names', () => {
    expect(personSlug('Ange T')).toBe('ange-t')
    expect(personSlug('Fleur & Galina')).toBe('fleur-galina')
    expect(personSlug('Sal & TX')).toBe('sal-tx')
  })

  it('strips diacritics', () => {
    expect(personSlug('Curaçao')).toBe('curacao')
  })
})

describe('flagUrl', () => {
  it('builds a flagcdn URL from the team flag emoji', () => {
    expect(flagUrl(team({ flag_icon: '🇯🇵' }))).toBe('https://flagcdn.com/jp.svg')
  })

  it('returns null when the emoji is not a flag', () => {
    expect(flagUrl(team({ flag_icon: '⚽' }))).toBeNull()
  })
})

describe('indexTeamsByName', () => {
  it('indexes teams by name and normalised name', () => {
    const korea = team({
      name: 'South Korea',
      name_normalised: 'Korea Republic',
    })
    const index = indexTeamsByName([korea])
    expect(index.get('South Korea')).toBe(korea)
    expect(index.get('Korea Republic')).toBe(korea)
    expect(index.get('Nowhere')).toBeUndefined()
  })
})

describe('roundOrder', () => {
  it('orders matchdays numerically before knockout rounds', () => {
    expect(roundOrder('Matchday 1')).toBeLessThan(roundOrder('Matchday 14'))
    expect(roundOrder('Matchday 17')).toBeLessThan(roundOrder('Round of 32'))
    expect(roundOrder('Round of 32')).toBeLessThan(roundOrder('Round of 16'))
    expect(roundOrder('Semi-final')).toBeLessThan(roundOrder('Final'))
  })
})

describe('isKnockoutRound', () => {
  it('flags the knockout rounds but not group matchdays', () => {
    expect(isKnockoutRound('Matchday 1')).toBe(false)
    expect(isKnockoutRound('Matchday 17')).toBe(false)
    expect(isKnockoutRound('Round of 32')).toBe(true)
    expect(isKnockoutRound('Final')).toBe(true)
    expect(isKnockoutRound('Match for third place')).toBe(true)
  })
})

describe('feederMatchNum', () => {
  it('reads the match number from a winner/loser placeholder', () => {
    expect(feederMatchNum('W74')).toBe(74)
    expect(feederMatchNum('L101')).toBe(101)
  })

  it('returns null for real teams or group placeholders', () => {
    expect(feederMatchNum('Brazil')).toBeNull()
    expect(feederMatchNum('3A/B/C/D/F')).toBeNull()
    expect(feederMatchNum('1F')).toBeNull()
  })
})

describe('buildBracket', () => {
  const ko = (num: number, round: string, team1: string, team2: string): Match => ({
    round,
    num,
    date: '2026-07-01',
    time: '13:00 UTC-6',
    team1,
    team2,
    ground: 'Somewhere',
  })

  // A compact but faithful bracket: 4 R16 → 2 QF → 1 SF/Final, plus 3rd place.
  const matches: Match[] = [
    ko(1, 'Round of 16', 'A', 'B'),
    ko(2, 'Round of 16', 'C', 'D'),
    ko(3, 'Round of 16', 'E', 'F'),
    ko(4, 'Round of 16', 'G', 'H'),
    ko(5, 'Quarter-final', 'W1', 'W2'),
    ko(6, 'Quarter-final', 'W3', 'W4'),
    ko(7, 'Semi-final', 'W5', 'W6'),
    ko(9, 'Match for third place', 'L7', 'L8'),
    ko(8, 'Final', 'W7', 'W8'),
  ]

  it('keeps only knockout rounds, in left-to-right order', () => {
    const { rounds } = buildBracket([
      ...matches,
      { ...ko(0, 'Matchday 1', 'X', 'Y') },
    ])
    expect(rounds.map((r) => r.round)).toEqual([
      'Round of 16',
      'Quarter-final',
      'Semi-final',
      'Final',
    ])
  })

  it('orders each round so matches sit between the two they feed', () => {
    const { rounds } = buildBracket(matches)
    const r16 = rounds.find((r) => r.round === 'Round of 16')!
    // Final(8)→W7,W8 ; SF7→W5,W6 ; QF5→W1,W2, QF6→W3,W4 — so R16 reads 1,2,3,4.
    expect(r16.matches.map((m) => m.num)).toEqual([1, 2, 3, 4])
  })

  it('pulls the third-place play-off out of the main tree', () => {
    const { rounds, thirdPlace } = buildBracket(matches)
    expect(thirdPlace?.num).toBe(9)
    expect(rounds.some((r) => r.round === 'Match for third place')).toBe(false)
  })

  it('spans each match over the leaf rows it sits above', () => {
    const { slots, leafCount } = buildBracket(matches)
    // Four first-round matches → one leaf row each.
    expect(slots.get(1)).toEqual({ start: 0, span: 1 })
    expect(slots.get(4)).toEqual({ start: 3, span: 1 })
    // A quarter-final centres over its two feeders.
    expect(slots.get(5)).toEqual({ start: 0, span: 2 })
    expect(slots.get(6)).toEqual({ start: 2, span: 2 })
    // The semi covers all four leaf rows.
    expect(slots.get(7)).toEqual({ start: 0, span: 4 })
    expect(leafCount).toBeGreaterThanOrEqual(4)
  })
})

describe('resolveFeeder', () => {
  const m = (num: number, team1: string, team2: string, score?: Match['score']): Match => ({
    round: 'Round of 16',
    num,
    date: '2026-07-01',
    time: '13:00',
    team1,
    team2,
    ground: 'Somewhere',
    score,
  })

  const byNum = (list: Match[]) => {
    const map = new Map<number, Match>()
    for (const x of list) if (x.num != null) map.set(x.num, x)
    return map
  }

  it('carries the winner of a decided match forward', () => {
    const map = byNum([m(1, 'Brazil', 'Japan', { ft: [2, 1] })])
    expect(resolveFeeder('W1', map)).toBe('Brazil')
    expect(resolveFeeder('L1', map)).toBe('Japan')
  })

  it('resolves a penalty-shootout winner', () => {
    const map = byNum([m(1, 'Germany', 'Paraguay', { ft: [0, 0], p: [4, 3] })])
    expect(resolveFeeder('W1', map)).toBe('Germany')
  })

  it('keeps the placeholder while the match is undecided', () => {
    const map = byNum([m(1, 'Brazil', 'Japan')])
    expect(resolveFeeder('W1', map)).toBe('W1')
  })

  it('follows a chain of resolved feeders', () => {
    const map = byNum([
      m(1, 'Brazil', 'Japan', { ft: [2, 1] }),
      m(2, 'W1', 'Spain', { ft: [3, 0] }),
    ])
    expect(resolveFeeder('W2', map)).toBe('Brazil')
  })

  it('returns concrete team names unchanged', () => {
    expect(resolveFeeder('Brazil', byNum([]))).toBe('Brazil')
  })
})

describe('computeSweepStandings / estimateLastPlace', () => {
  const t = (name: string): Team => team({ name })
  const sweep: SweepRow[] = [
    { person: 'Ann', team: t('Brazil') },
    { person: 'Bob', team: t('Japan') },
    { person: 'Cat', team: t('Mexico') },
  ]
  const played = (
    round: string,
    team1: string,
    team2: string,
    ft: [number, number],
    extra?: Match['score'],
  ): Match => ({
    round,
    date: '2026-06-11',
    time: '13:00 UTC-6',
    team1,
    team2,
    ground: 'X',
    score: { ft, ...extra },
  })

  it('returns null before any match is played', () => {
    const upcoming = [{ ...played('Matchday 1', 'Brazil', 'Japan', [0, 0]), score: undefined }]
    expect(estimateLastPlace(upcoming, sweep)).toBeNull()
  })

  it('ranks the worst group performer as last', () => {
    const matches = [
      played('Matchday 1', 'Brazil', 'Japan', [3, 0]), // Ann +3, Bob loses
      played('Matchday 1', 'Mexico', 'Spain', [1, 1]), // Cat draws
    ]
    const last = estimateLastPlace(matches, sweep)
    expect(last?.person).toBe('Bob')
  })

  it('counts knockout wins as survived rounds, lifting a team above group sides', () => {
    const matches = [
      played('Matchday 1', 'Brazil', 'Spain', [0, 2]), // Ann: group loss
      played('Matchday 1', 'Japan', 'Spain', [2, 0]), // Bob: group win (3 pts)
      played('Matchday 1', 'Mexico', 'Spain', [0, 1]), // Cat: group loss
      played('Round of 16', 'Brazil', 'Italy', [1, 1], { p: [4, 2] }), // Ann: wins on pens
    ]
    const standings = computeSweepStandings(matches, sweep)
    // Ann survived a knockout round, so she ranks ahead of Bob's 3 group points.
    expect(standings.map((s) => s.person)).toEqual(['Ann', 'Bob', 'Cat'])
    expect(standings[0].knockoutWins).toBe(1)
    expect(estimateLastPlace(matches, sweep)?.person).toBe('Cat')
  })
})

describe('groupBy', () => {
  it('buckets items by key while preserving insertion order', () => {
    const grouped = groupBy([1, 2, 3, 4], (n) => (n % 2 === 0 ? 'even' : 'odd'))
    expect([...grouped.keys()]).toEqual(['odd', 'even'])
    expect(grouped.get('even')).toEqual([2, 4])
  })
})

describe('formatMatchDate', () => {
  it('formats an ISO date in en-GB short form', () => {
    expect(formatMatchDate('2026-06-11')).toBe('Thu 11 Jun')
  })

  it('returns the input when it is not a valid date', () => {
    expect(formatMatchDate('not-a-date')).toBe('not-a-date')
  })

  it('rolls to the Melbourne day for a late overseas kick-off', () => {
    // 20:00 UTC-6 on 11 Jun = 02:00 UTC 12 Jun = 12:00 AEST 12 Jun.
    expect(formatMatchDate('2026-06-11', '20:00 UTC-6')).toBe('Fri 12 Jun')
  })
})

describe('formatMatchTime', () => {
  it('converts a venue time + offset to Melbourne (AEST = UTC+10)', () => {
    // 13:00 UTC-6 = 19:00 UTC = 05:00 AEST next day.
    expect(formatMatchTime('2026-06-11', '13:00 UTC-6')).toBe('05:00')
    // 20:00 UTC-6 = 02:00 UTC = 12:00 AEST next day.
    expect(formatMatchTime('2026-06-11', '20:00 UTC-6')).toBe('12:00')
    // 12:00 UTC-4 = 16:00 UTC = 02:00 AEST next day.
    expect(formatMatchTime('2026-06-18', '12:00 UTC-4')).toBe('02:00')
  })

  it('returns the raw time when it cannot be parsed', () => {
    expect(formatMatchTime('2026-06-11', 'TBD')).toBe('TBD')
  })
})
