import { useState } from 'react'

interface AvatarProps {
  name: string
  /** Optional photo URL. When absent (or it fails to load) a placeholder is shown. */
  src?: string
  className?: string
}

/** Up to two initials from a name, ignoring "&" joiners (e.g. "Fleur & Galina" -> "FG"). */
export function initials(name: string): string {
  const words = name.split(/[\s&]+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/** Deterministic hue from a name, so each person keeps a stable placeholder colour. */
function hueFor(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360
  }
  return hash
}

/**
 * Player avatar. Renders the photo at `src` when available, otherwise a coloured
 * placeholder with the person's initials. Real photos can be added later by
 * passing `src` (e.g. from a `photo` field in people.json) — no other changes needed.
 */
export function Avatar({ name, src, className }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const cls = `avatar${className ? ` ${className}` : ''}`

  if (src && !failed) {
    return (
      <img
        className={cls}
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    )
  }

  const hue = hueFor(name)
  return (
    <span
      className={`${cls} avatar--placeholder`}
      role="img"
      aria-label={name}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 70% 62%), hsl(${(hue + 40) % 360} 68% 52%))`,
      }}
    >
      {initials(name)}
    </span>
  )
}
