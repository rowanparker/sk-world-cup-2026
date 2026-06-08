import { useState } from 'react'
import type { Team } from '../types'
import { flagUrl } from '../utils'

interface FlagProps {
  team: Team
  className?: string
}

/**
 * Renders a country's flag as an SVG from flagcdn.com, falling back to the
 * emoji flag from the source data if the image can't be loaded.
 */
export function Flag({ team, className }: FlagProps) {
  const [failed, setFailed] = useState(false)
  const url = flagUrl(team)

  if (url && !failed) {
    return (
      <img
        className={`flag${className ? ` ${className}` : ''}`}
        src={url}
        alt={`${team.name} flag`}
        loading="lazy"
        width={48}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <span
      className={`flag flag--emoji${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={`${team.name} flag`}
    >
      {team.flag_icon}
    </span>
  )
}
