import { describe, expect, it } from 'vitest'
import {
  flagEmojiToIso,
  flagUrl,
  formatMatchDate,
  groupBy,
  indexTeamsByName,
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
})
