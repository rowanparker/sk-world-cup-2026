import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PeopleGrid } from './PeopleGrid'
import type { SweepRow, Team } from '../types'

const noop = () => {}

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
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('renders every sweep entry sorted by person', () => {
    render(<PeopleGrid sweep={sweep} selectedPerson={null} onSelect={noop} />)
    const names = screen.getAllByText(/Rowan|Sav/).map((n) => n.textContent)
    expect(names).toEqual(['Rowan', 'Sav'])
    expect(screen.getByText('Japan')).toBeInTheDocument()
    expect(screen.getByText('South Korea')).toBeInTheDocument()
  })

  it('starts collapsed and remembers the open preference', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <PeopleGrid sweep={sweep} selectedPerson={null} onSelect={noop} />,
    )
    // Default: collapsed.
    const toggle = screen.getByRole('button', { name: 'Expand the sweep' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(
      screen.getByRole('button', { name: 'Collapse the sweep' }),
    ).toHaveAttribute('aria-expanded', 'true')
    expect(localStorage.getItem('sweep:open')).toBe('true')

    // Remount: preference is restored from localStorage.
    unmount()
    render(<PeopleGrid sweep={sweep} selectedPerson={null} onSelect={noop} />)
    expect(
      screen.getByRole('button', { name: 'Collapse the sweep' }),
    ).toHaveAttribute('aria-expanded', 'true')
  })

  it('selects a person on click and deselects when clicked again', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const { rerender } = render(
      <PeopleGrid sweep={sweep} selectedPerson={null} onSelect={onSelect} />,
    )

    await user.click(screen.getByRole('button', { name: 'Expand the sweep' }))
    await user.click(screen.getByRole('button', { name: /Rowan/ }))
    expect(onSelect).toHaveBeenCalledWith('Rowan')

    rerender(
      <PeopleGrid sweep={sweep} selectedPerson="Rowan" onSelect={onSelect} />,
    )
    const active = screen.getByRole('button', { name: /Rowan/ })
    expect(active).toHaveAttribute('aria-pressed', 'true')

    await user.click(active)
    expect(onSelect).toHaveBeenLastCalledWith(null)
  })
})
