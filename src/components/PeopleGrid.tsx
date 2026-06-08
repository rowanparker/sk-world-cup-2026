import { useMemo } from 'react'
import type { SweepRow } from '../types'
import { useCollapsible } from '../hooks/useCollapsible'
import { avatarUrl } from '../utils'
import { Avatar } from './Avatar'
import { Chevron } from './Chevron'
import { Flag } from './Flag'

interface PeopleGridProps {
  sweep: SweepRow[]
  selectedPerson: string | null
  onSelect: (person: string | null) => void
}

export function PeopleGrid({ sweep, selectedPerson, onSelect }: PeopleGridProps) {
  const [open, setOpen] = useCollapsible('sweep:open', false)

  const rows = useMemo(
    () => [...sweep].sort((a, b) => a.person.localeCompare(b.person)),
    [sweep],
  )

  return (
    <section className="panel" aria-labelledby="people-heading">
      <div className="panel__head">
        <div className="panel__head-left">
          <button
            type="button"
            className="panel__toggle"
            aria-expanded={open}
            aria-controls="people-collapse"
            aria-label={open ? 'Collapse the sweep' : 'Expand the sweep'}
            onClick={() => setOpen((o) => !o)}
          >
            <Chevron open={open} />
          </button>
          <h2 id="people-heading" className="panel__title">
            The Sweep
          </h2>
        </div>
      </div>

      <div
        id="people-collapse"
        className={`panel__collapse${open ? ' panel__collapse--open' : ''}`}
      >
        <div className="panel__collapse-inner" {...(open ? {} : { inert: '' })}>
          <ul className="people-grid">
            {rows.map((row) => {
              const isActive = row.person === selectedPerson
              return (
                <li key={row.person}>
                  <button
                    type="button"
                    className={`person-card${isActive ? ' person-card--active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => onSelect(isActive ? null : row.person)}
                  >
                    <Avatar
                      name={row.person}
                      src={avatarUrl(row.person)}
                      className="person-card__avatar"
                    />
                    <div className="person-card__body">
                      <span className="person-card__name">{row.person}</span>
                      <span className="person-card__team">
                        <Flag team={row.team} className="person-card__flag" />
                        <span className="person-card__teamname">
                          {row.team.name}
                        </span>
                      </span>
                    </div>
                    <span className="badge" title={`Group ${row.team.group}`}>
                      {row.team.group}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
