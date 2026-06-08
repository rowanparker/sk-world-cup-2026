import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PeopleGrid } from './PeopleGrid'
import type { SweepRow, Team } from '../types'

const mkTeam = (name: string, group: string, code: string): Team => ({
  name,
  continent: 'Test',
  flag_icon: '🇯🇵',
  flag_unicode: '',
  fifa_code: code,
  group,
  confed: 'AFC',
})

const sweep: SweepRow[] = [
  { person: 'Rowan', team: mkTeam('Japan', 'F', 'JPN') },
  { person: 'Sav', team: mkTeam('South Korea', 'A', 'KOR') },
]

describe('PeopleGrid', () => {
  it('renders every sweep entry sorted by person', () => {
    render(<PeopleGrid sweep={sweep} />)
    const names = screen.getAllByText(/Rowan|Sav/).map((n) => n.textContent)
    expect(names).toEqual(['Rowan', 'Sav'])
    expect(screen.getByText('Japan')).toBeInTheDocument()
    expect(screen.getByText('South Korea')).toBeInTheDocument()
  })

  it('filters by search query', async () => {
    const user = userEvent.setup()
    render(<PeopleGrid sweep={sweep} />)
    await user.type(screen.getByLabelText('Search the sweep'), 'korea')
    expect(screen.getByText('South Korea')).toBeInTheDocument()
    expect(screen.queryByText('Japan')).not.toBeInTheDocument()
  })
})
