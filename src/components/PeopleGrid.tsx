import { useMemo, useState } from 'react'
import type { SweepRow } from '../types'
import { Flag } from './Flag'

interface PeopleGridProps {
  sweep: SweepRow[]
}

export function PeopleGrid({ sweep }: PeopleGridProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = [...sweep].sort((a, b) => a.person.localeCompare(b.person))
    if (!q) return rows
    return rows.filter(
      (row) =>
        row.person.toLowerCase().includes(q) ||
        row.team.name.toLowerCase().includes(q) ||
        row.team.fifa_code.toLowerCase().includes(q),
    )
  }, [sweep, query])

  return (
    <section className="panel" aria-labelledby="people-heading">
      <div className="panel__head">
        <h2 id="people-heading" className="panel__title">
          The Sweep
        </h2>
        <input
          className="search"
          type="search"
          placeholder="Search person or country…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the sweep"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="empty">No matches for “{query}”.</p>
      ) : (
        <ul className="people-grid">
          {filtered.map((row) => (
            <li key={row.person} className="person-card">
              <Flag team={row.team} className="person-card__flag" />
              <div className="person-card__body">
                <span className="person-card__name">{row.person}</span>
                <span className="person-card__team">{row.team.name}</span>
              </div>
              <span className="badge" title={`Group ${row.team.group}`}>
                {row.team.group}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
