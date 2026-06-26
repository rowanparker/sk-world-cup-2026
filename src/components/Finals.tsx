import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Match, SweepRow, Team } from '../types'
import { useCollapsible } from '../hooks/useCollapsible'
import {
  buildBracket,
  formatMatchDate,
  indexTeamsByName,
  matchResult,
} from '../utils'
import type { MatchResult } from '../utils'
import { Chevron } from './Chevron'
import { Flag } from './Flag'

interface FinalsProps {
  matches: Match[]
  teams: Team[]
  sweep: SweepRow[]
}

interface BracketSide {
  team: Team | null
  person: string | null
  /** Raw reference shown when no real team resolves yet (e.g. "W74", "1F"). */
  label: string
  /** Goals scored, when the match has been played. */
  goals: number | null
  won: boolean
}

/** Everything after match day 17 — the knockout bracket — lives here. */
export function Finals({ matches, teams, sweep }: FinalsProps) {
  const [open, setOpen] = useCollapsible('finals:open', true)

  const teamsByName = useMemo(() => indexTeamsByName(teams), [teams])
  const ownerByTeam = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of sweep) map.set(row.team.name, row.person)
    return map
  }, [sweep])

  const bracket = useMemo(() => buildBracket(matches), [matches])

  const scrollerRef = useRef<HTMLDivElement>(null)
  // Track whether there's room to scroll either way, to enable/disable the arrows.
  const [canScroll, setCanScroll] = useState({ left: false, right: false })

  const updateScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    setCanScroll({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    })
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    updateScroll()
    // Turn a vertical mouse wheel into horizontal scroll, but only while the
    // bracket still has room that way — at either end the page scrolls normally.
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return
      const atStart = el.scrollLeft <= 0
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
      if ((e.deltaY > 0 && atEnd) || (e.deltaY < 0 && atStart)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('scroll', updateScroll, { passive: true })
    const observer = new ResizeObserver(updateScroll)
    observer.observe(el)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('scroll', updateScroll)
      observer.disconnect()
    }
  }, [updateScroll, bracket])

  const scrollByColumn = (dir: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' })
  }

  const resolveSide = (
    ref: string,
    result: MatchResult | null,
    which: 1 | 2,
  ): BracketSide => {
    const team = teamsByName.get(ref) ?? null
    const goals = result ? result.ft[which - 1] : null
    return {
      team,
      person: team ? ownerByTeam.get(team.name) ?? null : null,
      label: ref,
      goals,
      won: result?.winner === which,
    }
  }

  if (bracket.rounds.length === 0) return null

  return (
    <section className="panel" aria-labelledby="finals-heading">
      <div className="panel__head">
        <div className="panel__head-left">
          <button
            type="button"
            className="panel__toggle"
            aria-expanded={open}
            aria-controls="finals-collapse"
            aria-label={open ? 'Collapse the finals' : 'Expand the finals'}
            onClick={() => setOpen((o) => !o)}
          >
            <Chevron open={open} />
          </button>
          <h2 id="finals-heading" className="panel__title">
            Finals
          </h2>
        </div>
        {open && (canScroll.left || canScroll.right) && (
          <div className="bracket-nav" role="group" aria-label="Scroll the bracket">
            <button
              type="button"
              className="bracket-nav__btn"
              onClick={() => scrollByColumn(-1)}
              disabled={!canScroll.left}
              aria-label="Scroll bracket left"
            >
              ‹
            </button>
            <button
              type="button"
              className="bracket-nav__btn"
              onClick={() => scrollByColumn(1)}
              disabled={!canScroll.right}
              aria-label="Scroll bracket right"
            >
              ›
            </button>
          </div>
        )}
      </div>

      <div
        id="finals-collapse"
        className={`panel__collapse${open ? ' panel__collapse--open' : ''}`}
      >
        <div className="panel__collapse-inner" {...(open ? {} : { inert: '' })}>
          <div className="bracket" role="presentation" ref={scrollerRef}>
            {bracket.rounds.map((round) => (
              <div key={round.round} className="bracket__round">
                <h3 className="bracket__round-title">{round.round}</h3>
                <div className="bracket__matches">
                  {round.matches.map((match) => (
                    <BracketMatch
                      key={match.num ?? match.date}
                      match={match}
                      resolveSide={resolveSide}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {bracket.thirdPlace && (
            <div className="bracket__third">
              <h3 className="bracket__round-title">Third place</h3>
              <BracketMatch
                match={bracket.thirdPlace}
                resolveSide={resolveSide}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function BracketMatch({
  match,
  resolveSide,
}: {
  match: Match
  resolveSide: (
    ref: string,
    result: MatchResult | null,
    which: 1 | 2,
  ) => BracketSide
}) {
  const result = matchResult(match)
  const side1 = resolveSide(match.team1, result, 1)
  const side2 = resolveSide(match.team2, result, 2)

  return (
    <div className="bracket-match">
      <div className="bracket-match__date">
        {formatMatchDate(match.date, match.time)}
      </div>
      <BracketSideRow side={side1} />
      <BracketSideRow side={side2} />
      {result?.detail && (
        <div className="bracket-match__detail">{result.detail}</div>
      )}
    </div>
  )
}

function BracketSideRow({ side }: { side: BracketSide }) {
  return (
    <div className={`bracket-side${side.won ? ' bracket-side--won' : ''}`}>
      {side.team ? (
        <>
          <Flag team={side.team} className="bracket-side__flag" />
          <span className="bracket-side__names">
            <span className="bracket-side__team">{side.team.name}</span>
            {side.person && (
              <span className="bracket-side__person">{side.person}</span>
            )}
          </span>
        </>
      ) : (
        <span className="bracket-side__placeholder">{side.label}</span>
      )}
      {side.goals !== null && (
        <span className="bracket-side__score">{side.goals}</span>
      )}
    </div>
  )
}
