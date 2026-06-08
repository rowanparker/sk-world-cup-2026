import { useMemo, useState } from 'react'
import type { Match, SweepRow, Team } from '../types'
import { formatMatchDate, groupBy, indexTeamsByName, roundOrder } from '../utils'
import { Flag } from './Flag'

interface MatchScheduleProps {
  matches: Match[]
  teams: Team[]
  sweep: SweepRow[]
}

interface ResolvedSide {
  /** The matched team, if `ref` is a real team name (vs a placeholder like "2A"). */
  team: Team | null
  /** Owner of the team in the sweep, if any. */
  person: string | null
  /** Raw reference to display when no team resolves. */
  label: string
}

export function MatchSchedule({ matches, teams, sweep }: MatchScheduleProps) {
  const [groupStageOnly, setGroupStageOnly] = useState(false)

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
    const visible = groupStageOnly
      ? matches.filter((m) => m.group)
      : matches
    const sorted = [...visible].sort((a, b) => {
      const byRound = roundOrder(a.round) - roundOrder(b.round)
      if (byRound !== 0) return byRound
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return (a.num ?? 0) - (b.num ?? 0)
    })
    return groupBy(sorted, (m) => m.round)
  }, [matches, groupStageOnly])

  return (
    <section className="panel" aria-labelledby="schedule-heading">
      <div className="panel__head">
        <h2 id="schedule-heading" className="panel__title">
          Match Schedule
        </h2>
        <label className="toggle">
          <input
            type="checkbox"
            checked={groupStageOnly}
            onChange={(e) => setGroupStageOnly(e.target.checked)}
          />
          Group stage only
        </label>
      </div>

      <div className="schedule">
        {[...rounds.entries()].map(([round, roundMatches]) => (
          <div key={round} className="round">
            <h3 className="round__title">{round}</h3>
            <ul className="match-list">
              {roundMatches.map((match, i) => (
                <li key={match.num ?? `${round}-${i}`} className="match">
                  <div className="match__meta">
                    <span className="match__date">
                      {formatMatchDate(match.date)}
                    </span>
                    <span className="match__time">{match.time}</span>
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
