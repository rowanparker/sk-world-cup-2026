import { describe, expect, it } from 'vitest'
import { buildSweep, toRawUrl } from './api'
import type { SweepEntry, Team } from './types'

const teams: Team[] = [
  {
    name: 'South Korea',
    name_normalised: 'Korea Republic',
    continent: 'Asia',
    flag_icon: '🇰🇷',
    flag_unicode: '',
    fifa_code: 'KOR',
    group: 'A',
    confed: 'AFC',
  },
  {
    name: 'Japan',
    continent: 'Asia',
    flag_icon: '🇯🇵',
    flag_unicode: '',
    fifa_code: 'JPN',
    group: 'F',
    confed: 'AFC',
  },
]

describe('toRawUrl', () => {
  it('rewrites a github blob URL to raw.githubusercontent.com', () => {
    expect(
      toRawUrl(
        'https://github.com/openfootball/worldcup.json/blob/master/2026/worldcup.teams.json',
      ),
    ).toBe(
      'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.teams.json',
    )
  })
})

describe('buildSweep', () => {
  it('joins sweep entries to their team records', () => {
    const entries: SweepEntry[] = [
      { person: 'Rowan', team: 'Japan' },
      { person: 'Sav', team: 'South Korea' },
    ]
    const rows = buildSweep(entries, teams)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ person: 'Rowan', team: teams[1] })
    expect(rows[1].team.fifa_code).toBe('KOR')
  })

  it('skips entries with no matching team', () => {
    const rows = buildSweep([{ person: 'Ghost', team: 'Atlantis' }], teams)
    expect(rows).toHaveLength(0)
  })
})
