import { useMemo, useState } from 'react'
import type { Match, SweepRow, Team } from '../types'
import { useCollapsible } from '../hooks/useCollapsible'
import {
  formatMatchDate,
  formatMatchTime,
  groupBy,
  indexTeamsByName,
  isKnockoutRound,
  matchResult,
  roundOrder,
} from '../utils'
import { Chevron } from './Chevron'
import { Flag } from './Flag'

interface MatchScheduleProps {
  matches: Match[]
  teams: Team[]
  sweep: SweepRow[]
  /** When set, only show matches involving this person's team. */
  selectedPerson: string | null
}

interface ResolvedSide {
  /** The matched team, if `ref` is a real team name (vs a placeholder like "2A"). */
  team: Team | null
  /** Owner of the team in the sweep, if any. */
  person: string | null
  /** Raw reference to display when no team resolves. */
  label: string
}

export function MatchSchedule({
  matches,
  teams,
  sweep,
  selectedPerson,
}: MatchScheduleProps) {
  const [open, setOpen] = useCollapsible('schedule:open', true)
  const [showPlayed, setShowPlayed] = useState(false)

  const teamsByName = useMemo(() => indexTeamsByName(teams), [teams])
  const ownerByTeam = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of sweep) map.set(row.team.name, row.person)
    return map
  }, [sweep])

  const resolveSide = (ref: string): ResolvedSide => {
    const team = teamsByName.get(ref) ?? null
    return {
      team,
      person: team ? ownerByTeam.get(team.name) ?? null : null,
      label: ref,
    }
  }

  const rounds = useMemo(() => {
    // The knockout rounds live in the "Finals" bracket; keep only group-stage
    // matchdays here.
    let visible = matches.filter((m) => !isKnockoutRound(m.round))
    if (selectedPerson)
      visible = visible.filter(
        (m) =>
          resolveSide(m.team1).person === selectedPerson ||
          resolveSide(m.team2).person === selectedPerson,
      )
    if (!showPlayed) visible = visible.filter((m) => !matchResult(m))
    const sorted = [...visible].sort((a, b) => {
      const byRound = roundOrder(a.round) - roundOrder(b.round)
      if (byRound !== 0) return byRound
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return (a.num ?? 0) - (b.num ?? 0)
    })
    return groupBy(sorted, (m) => m.round)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, selectedPerson, showPlayed, teamsByName, ownerByTeam])

  return (
    <section className="panel" aria-labelledby="schedule-heading">
      <div className="panel__head">
        <div className="panel__head-left">
          <button
            type="button"
            className="panel__toggle"
            aria-expanded={open}
            aria-controls="schedule-collapse"
            aria-label={open ? 'Collapse the schedule' : 'Expand the schedule'}
            onClick={() => setOpen((o) => !o)}
          >
            <Chevron open={open} />
          </button>
          <h2 id="schedule-heading" className="panel__title">
            Match Schedule
          </h2>
        </div>
        <div className="schedule__controls">
          {selectedPerson && (
            <span className="schedule__filter">
              Showing {selectedPerson}’s matches
            </span>
          )}
          <label className="schedule__toggle">
            <input
              type="checkbox"
              checked={showPlayed}
              onChange={(e) => setShowPlayed(e.target.checked)}
            />
            Show already played
          </label>
        </div>
      </div>

      <div
        id="schedule-collapse"
        className={`panel__collapse${open ? ' panel__collapse--open' : ''}`}
      >
        <div className="panel__collapse-inner" {...(open ? {} : { inert: '' })}>
          <div className="schedule">
            {rounds.size === 0 && (
              <p className="empty">No matches for {selectedPerson}.</p>
            )}
            {[...rounds.entries()].map(([round, roundMatches]) => (
              <div key={round} className="round">
                <h3 className="round__title">{round}</h3>
                <ul className="match-list">
                  {roundMatches.map((match, i) => (
                    <li key={match.num ?? `${round}-${i}`} className="match">
                      <div className="match__meta">
                        <span className="match__date">
                          {formatMatchDate(match.date, match.time)}
                        </span>
                        <span className="match__time">
                          {formatMatchTime(match.date, match.time)}{' '}
                          <span className="match__tz">(MEL)</span>
                        </span>
                        {match.group && (
                          <span className="match__group">{match.group}</span>
                        )}
                      </div>
                      <div className="match__teams">
                        <Side side={resolveSide(match.team1)} align="right" />
                        <span className="match__vs">v</span>
                        <Side side={resolveSide(match.team2)} align="left" />
                      </div>
                      <div className="match__ground">{match.ground}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Side({ side, align }: { side: ResolvedSide; align: 'left' | 'right' }) {
  return (
    <div className={`side side--${align}`}>
      {side.team ? (
        <>
          <Flag team={side.team} className="side__flag" />
          <span className="side__names">
            <span className="side__team">{side.team.name}</span>
            {side.person && <span className="side__person">{side.person}</span>}
          </span>
        </>
      ) : (
        <span className="side__placeholder">{side.label}</span>
      )}
    </div>
  )
}
