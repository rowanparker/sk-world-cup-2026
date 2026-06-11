import { describe, expect, it } from 'vitest'
import { mergeBackupScores } from './backup'
import type { Match } from './types'

const match = (over: Partial<Match>): Match => ({
  round: 'Matchday 1',
  date: '2026-06-11',
  time: '13:00 UTC-6',
  team1: 'Mexico',
  team2: 'South Africa',
  ground: 'Estadio Azteca',
  ...over,
})

const result = (over: Partial<Parameters<typeof mergeBackupScores>[1][number]>) => ({
  date: '2026-06-11',
  home: 'Mexico',
  away: 'South Africa',
  homeGoals: 2,
  awayGoals: 0,
  ...over,
})

describe('mergeBackupScores', () => {
  it('fills the score of a match that openfootball has not updated', () => {
    const [m] = mergeBackupScores([match({})], [result({})])
    expect(m.score).toEqual({ ft: [2, 0] })
  })

  it('never overrides a score openfootball already has', () => {
    const original = match({ score: { ft: [1, 1] } })
    const [m] = mergeBackupScores([original], [result({ homeGoals: 5 })])
    expect(m.score).toEqual({ ft: [1, 1] })
    expect(m).toBe(original) // untouched matches are returned as-is
  })

  it('orients home/away goals onto team1/team2 when the fixture is reversed', () => {
    // openfootball lists South Africa first; backup lists Mexico at home.
    const m = match({ team1: 'South Africa', team2: 'Mexico' })
    const [out] = mergeBackupScores([m], [result({})])
    expect(out.score).toEqual({ ft: [0, 2] })
  })

  it('matches across name-spelling differences', () => {
    const m = match({ team1: 'Bosnia & Herzegovina', team2: 'South Korea' })
    const r = result({ home: 'Bosnia-Herzegovina', away: 'Korea Republic', homeGoals: 1, awayGoals: 3 })
    const [out] = mergeBackupScores([m], [r])
    expect(out.score).toEqual({ ft: [1, 3] })
  })

  it('absorbs a one-day timezone drift in the kick-off date', () => {
    const [m] = mergeBackupScores([match({ date: '2026-06-12' })], [result({ date: '2026-06-11' })])
    expect(m.score).toEqual({ ft: [2, 0] })
  })

  it('ignores a same-pairing result from a different date', () => {
    const [m] = mergeBackupScores(
      [match({ date: '2026-06-18' })],
      [result({ date: '2026-06-11' })],
    )
    expect(m.score).toBeUndefined()
  })

  it('leaves matches untouched when there are no backup results', () => {
    const ms = [match({})]
    expect(mergeBackupScores(ms, [])).toBe(ms)
  })
})
