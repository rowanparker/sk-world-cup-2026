import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextMatch } from './NextMatch'
import type { Match, SweepRow, Team } from '../types'

const mkTeam = (name: string, code: string): Team => ({
  name,
  continent: 'Test',
  flag_icon: '🇯🇵',
  flag_unicode: '',
  fifa_code: code,
  group: 'A',
  confed: 'AFC',
})

const teams = [mkTeam('Mexico', 'MEX'), mkTeam('Japan', 'JPN'), mkTeam('Spain', 'ESP')]
const sweep: SweepRow[] = [{ person: 'Rowan', team: teams[1] }]

const matches: Match[] = [
  // Earliest, but in the past relative to our fixed clock.
  { round: 'Matchday 1', date: '2026-06-11', time: '13:00 UTC-6', team1: 'Mexico', team2: 'Spain', ground: 'Mexico City' },
  // The next upcoming match.
  { round: 'Matchday 1', date: '2026-06-12', time: '13:00 UTC-6', team1: 'Japan', team2: 'Spain', ground: 'Dallas' },
]

describe('NextMatch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 2026-06-11 12:00 UTC — after match 1 (19:00 UTC? no, 13:00 UTC-6 = 19:00 UTC)…
    // set clock between the two kick-offs: 2026-06-12 00:00 UTC.
    vi.setSystemTime(new Date('2026-06-12T00:00:00Z'))
  })

  afterEach(() => vi.useRealTimers())

  it('shows the earliest future match with its owners', () => {
    render(<NextMatch matches={matches} teams={teams} sweep={sweep} />)
    expect(screen.getByText('Japan')).toBeInTheDocument()
    expect(screen.getByText('★ Rowan')).toBeInTheDocument()
    // Spain has no owner in the sweep -> CPU.
    expect(screen.getByText('CPU')).toBeInTheDocument()
    // Match 1 (Mexico) is in the past and should not be shown.
    expect(screen.queryByText('Mexico')).not.toBeInTheDocument()
  })

  it('renders a fallback when there are no upcoming matches', () => {
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z'))
    render(<NextMatch matches={matches} teams={teams} sweep={sweep} />)
    expect(screen.getByText(/game over/i)).toBeInTheDocument()
  })
})
