import { useMemo } from 'react'
import type { Match, SweepRow } from '../types'
import { estimateLastPlace } from '../utils'
import { Flag } from './Flag'

interface Prize {
  place: string
  reward: string
  image: string
}

const PRIZES: Prize[] = [
  { place: '1st', reward: '$150 Rebel Gift Card', image: 'prizes/rebel.png' },
  { place: '2nd', reward: '$90 Wish Gift Card', image: 'prizes/wish.jpg' },
  {
    place: '3rd',
    reward: '$30 Coles & Myer Gift Card',
    image: 'prizes/coles-myer.jpg',
  },
  {
    place: 'Last',
    reward: '$30 Coles & Myer Gift Card',
    image: 'prizes/coles-myer.jpg',
  },
]

const MEDALS: Record<string, string> = {
  '1st': '🥇',
  '2nd': '🥈',
  '3rd': '🥉',
  Last: '🥄',
}

interface PrizesProps {
  matches: Match[]
  sweep: SweepRow[]
}

export function Prizes({ matches, sweep }: PrizesProps) {
  const lastPlace = useMemo(
    () => estimateLastPlace(matches, sweep),
    [matches, sweep],
  )

  return (
    <section className="panel prizes" aria-labelledby="prizes-heading">
      <div className="panel__head">
        <div className="panel__head-left">
          <h2 id="prizes-heading" className="panel__title">
            Prizes
          </h2>
        </div>
      </div>

      <ul className="prizes__list">
        {PRIZES.map((prize) => (
          <li
            key={prize.place}
            className={`prize prize--${prize.place.toLowerCase()}`}
          >
            <img
              className="prize__image"
              src={`${import.meta.env.BASE_URL}${prize.image}`}
              alt={`${prize.reward} artwork`}
              loading="lazy"
            />
            <div className="prize__info">
              <span className="prize__place">
                <span className="prize__medal" aria-hidden="true">
                  {MEDALS[prize.place]}
                </span>
                {prize.place}
              </span>
              <span className="prize__reward">{prize.reward}</span>
              {prize.place === 'Last' && lastPlace && (
                <span className="prize__estimate" title="Estimated from results so far">
                  <Flag team={lastPlace.team} className="prize__estimate-flag" />
                  <span className="prize__estimate-text">
                    Currently {lastPlace.person} ({lastPlace.team.name})
                  </span>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
