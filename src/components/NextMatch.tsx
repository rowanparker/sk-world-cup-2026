import { useEffect, useMemo, useState } from 'react'
import type { Match, SweepRow, Team } from '../types'
import {
  formatMatchDate,
  formatMatchTime,
  indexTeamsByName,
  matchInstant,
} from '../utils'
import { Flag } from './Flag'

interface NextMatchProps {
  matches: Match[]
  teams: Team[]
  sweep: SweepRow[]
}

interface UpcomingMatch {
  match: Match
  instant: Date
}

interface Fighter {
  team: Team | null
  person: string | null
  label: string
}

/** A ticking `Date.now()`, updated every second. */
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

const pad = (n: number) => String(n).padStart(2, '0')

export function NextMatch({ matches, teams, sweep }: NextMatchProps) {
  const now = useNow()

  const teamsByName = useMemo(() => indexTeamsByName(teams), [teams])
  const ownerByTeam = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of sweep) map.set(row.team.name, row.person)
    return map
  }, [sweep])

  // All matches with a resolvable kick-off, in chronological order.
  const schedule = useMemo<UpcomingMatch[]>(() => {
    return matches
      .map((match) => ({ match, instant: matchInstant(match.date, match.time) }))
      .filter((x): x is UpcomingMatch => x.instant != null)
      .sort((a, b) => a.instant.getTime() - b.instant.getTime())
  }, [matches])

  const next = useMemo(
    () => schedule.find((x) => x.instant.getTime() > now) ?? null,
    [schedule, now],
  )

  const resolve = (ref: string): Fighter => {
    const team = teamsByName.get(ref) ?? null
    return {
      team,
      person: team ? ownerByTeam.get(team.name) ?? null : null,
      label: ref,
    }
  }

  return (
    <section className="next-match" aria-labelledby="next-heading">
      <div className="next-match__scanlines" aria-hidden="true" />
      <h2 id="next-heading" className="next-match__title">
        Next Match
      </h2>

      {next ? (
        <div className="next-match__body">
          <div className="next-match__vs">
            <FighterCard fighter={resolve(next.match.team1)} />
            <span className="next-match__versus" aria-hidden="true">
              VS
            </span>
            <FighterCard fighter={resolve(next.match.team2)} />
          </div>

          <Countdown ms={Math.max(0, next.instant.getTime() - now)} />

          <p className="next-match__when">
            {next.match.round} · {formatMatchDate(next.match.date, next.match.time)}{' '}
            {formatMatchTime(next.match.date, next.match.time)} (MEL)
            {next.match.ground ? ` · ${next.match.ground}` : ''}
          </p>
        </div>
      ) : (
        <p className="next-match__none">No upcoming matches — game over!</p>
      )}
    </section>
  )
}

function FighterCard({ fighter }: { fighter: Fighter }) {
  return (
    <div className="fighter">
      {fighter.team ? (
        <>
          <Flag team={fighter.team} className="fighter__flag" />
          <span className="fighter__name">{fighter.team.name}</span>
          <span className="fighter__player">
            {fighter.person ? `★ ${fighter.person}` : 'CPU'}
          </span>
        </>
      ) : (
        <>
          <span className="fighter__flag fighter__flag--tbd" aria-hidden="true">
            ?
          </span>
          <span className="fighter__name">{fighter.label}</span>
          <span className="fighter__player">TBD</span>
        </>
      )}
    </div>
  )
}

function Countdown({ ms }: { ms: number }) {
  const total = Math.floor(ms / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  return (
    <div className="countdown" role="timer" aria-live="off">
      <Unit value={pad(days)} label="Days" />
      <span className="countdown__sep">:</span>
      <Unit value={pad(hours)} label="Hrs" />
      <span className="countdown__sep">:</span>
      <Unit value={pad(minutes)} label="Min" />
      <span className="countdown__sep">:</span>
      <Unit value={pad(seconds)} label="Sec" />
    </div>
  )
}

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <span className="countdown__unit">
      <span className="countdown__value">{value}</span>
      <span className="countdown__label">{label}</span>
    </span>
  )
}
