import { describe, expect, it } from 'vitest'
import {
  flagEmojiToIso,
  flagUrl,
  formatMatchDate,
  formatMatchTime,
  groupBy,
  indexTeamsByName,
  personSlug,
  roundOrder,
} from './utils'
import type { Team } from './types'

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
