import { useMemo } from 'react'
import type { Match, SweepRow, Team } from '../types'
import { useCollapsible } from '../hooks/useCollapsible'
import {
  formatMatchDate,
  indexTeamsByName,
  matchResult,
  roundOrder,
} from '../utils'
import type { MatchResult } from '../utils'
import { Chevron } from './Chevron'
import { Flag } from './Flag'

interface CompletedMatchesProps {
  matches: Match[]
  teams: Team[]
  sweep: SweepRow[]
}

interface CompletedRow {
  match: Match
  result: MatchResult
  team1: Team | null
  team2: Team | null
  person1: string | null
  person2: string | null
}

export function CompletedMatches({
  matches,
  teams,
  sweep,
}: CompletedMatchesProps) {
  const [open, setOpen] = useCollapsible('completed:open', true)

  const teamsByName = useMemo(() => indexTeamsByName(teams), [teams])
  const ownerByTeam = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of sweep) map.set(row.team.name, row.person)
    return map
  }, [sweep])

  const rows = useMemo<CompletedRow[]>(() => {
    return matches
      .map((match): CompletedRow | null => {
        const result = matchResult(match)
        if (!result) return null
        const team1 = teamsByName.get(match.team1) ?? null
        const team2 = teamsByName.get(match.team2) ?? null
        return {
          match,
          result,
          team1,
          team2,
          person1: team1 ? ownerByTeam.get(team1.name) ?? null : null,
          person2: team2 ? ownerByTeam.get(team2.name) ?? null : null,
        }
      })
      .filter((r): r is CompletedRow => r !== null)
      .sort((a, b) => {
        // Most recently played first.
        if (a.match.date !== b.match.date)
          return b.match.date.localeCompare(a.match.date)
        const byRound = roundOrder(b.match.round) - roundOrder(a.match.round)
        if (byRound !== 0) return byRound
        return (b.match.num ?? 0) - (a.match.num ?? 0)
      })
  }, [matches, teamsByName, ownerByTeam])

  return (
    <section className="panel" aria-labelledby="completed-heading">
      <div className="panel__head">
        <div className="panel__head-left">
          <button
            type="button"
            className="panel__toggle"
            aria-expanded={open}
            aria-controls="completed-collapse"
            aria-label={
              open ? 'Collapse completed matches' : 'Expand completed matches'
            }
            onClick={() => setOpen((o) => !o)}
          >
            <Chevron open={open} />
          </button>
          <h2 id="completed-heading" className="panel__title">
            Completed Matches
          </h2>
        </div>
        {rows.length > 0 && (
          <span className="schedule__filter">{rows.length} played</span>
        )}
      </div>

      <div
        id="completed-collapse"
        className={`panel__collapse${open ? ' panel__collapse--open' : ''}`}
      >
        <div className="panel__collapse-inner" {...(open ? {} : { inert: '' })}>
          {rows.length === 0 ? (
            <p className="empty">No matches have been played yet.</p>
          ) : (
            <div className="results-table" role="table" aria-label="Completed matches">
              <div className="results-table__head" role="row">
                <span role="columnheader">Date</span>
                <span role="columnheader">Match</span>
                <span role="columnheader" className="results-table__score-col">
                  Score
                </span>
                <span role="columnheader">Winner</span>
              </div>
              {rows.map((row) => (
                <ResultRow
                  key={row.match.num ?? `${row.match.round}-${row.match.date}`}
                  row={row}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ResultRow({ row }: { row: CompletedRow }) {
  const { match, result } = row
  const winnerTeam =
    result.winner === 1 ? row.team1 : result.winner === 2 ? row.team2 : null
  const winnerPerson =
    result.winner === 1 ? row.person1 : result.winner === 2 ? row.person2 : null

  return (
    <div className="results-row" role="row">
      <span className="results-row__date" role="cell">
        {formatMatchDate(match.date, match.time)}
        <span className="results-row__round">{match.round}</span>
      </span>

      <div className="results-row__teams" role="cell">
        <TeamCell
          team={row.team1}
          label={match.team1}
          won={result.winner === 1}
        />
        <span className="results-row__sep">v</span>
        <TeamCell
          team={row.team2}
          label={match.team2}
          won={result.winner === 2}
        />
      </div>

      <span className="results-row__score" role="cell">
        <span className="results-row__ft">
          {result.ft[0]}–{result.ft[1]}
        </span>
        {result.detail && (
          <span className="results-row__detail">{result.detail}</span>
        )}
      </span>

      <span className="results-row__winner" role="cell">
        {result.winner === null ? (
          <span className="results-row__draw">Draw</span>
        ) : (
          <>
            {winnerTeam && (
              <Flag team={winnerTeam} className="results-row__winflag" />
            )}
            <span className="results-row__winnames">
              <span className="results-row__winteam">
                {winnerTeam?.name ?? '—'}
              </span>
              {winnerPerson && (
                <span className="results-row__winperson">★ {winnerPerson}</span>
              )}
            </span>
          </>
        )}
      </span>
    </div>
  )
}

function TeamCell({
  team,
  label,
  won,
}: {
  team: Team | null
  label: string
  won: boolean
}) {
  return (
    <span className={`results-team${won ? ' results-team--won' : ''}`}>
      {team ? (
        <>
          <Flag team={team} className="results-team__flag" />
          <span className="results-team__name">{team.name}</span>
        </>
      ) : (
        <span className="results-team__name results-team__name--tbd">
          {label}
        </span>
      )}
    </span>
  )
}
