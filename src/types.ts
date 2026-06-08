export interface Team {
  name: string
  /** Some teams carry an alternate "official" name (e.g. South Korea -> Korea Republic). */
  name_normalised?: string
  continent: string
  flag_icon: string
  flag_unicode: string
  fifa_code: string
  group: string
  confed: string
}

export interface Stadium {
  city: string
  timezone: string
  cc: string
  name: string
  capacity: number
  coords: string
}

export interface StadiumsFile {
  name: string
  stadiums: Stadium[]
}

export interface Match {
  round: string
  num?: number
  date: string
  time: string
  time_local?: string
  team1: string
  team2: string
  group?: string
  ground: string
  score?: { ft?: [number, number]; et?: [number, number]; p?: [number, number] }
}

export interface MatchesFile {
  name: string
  matches: Match[]
}

/** A sweep entry: a person and the FIFA team name they were assigned. */
export interface SweepEntry {
  person: string
  team: string
}

/** Fully-resolved sweep row used by the UI: person joined to their Team. */
export interface SweepRow {
  person: string
  team: Team
}

export interface WorldCupData {
  teams: Team[]
  stadiums: Stadium[]
  matches: Match[]
  qualiPlayoffs: Match[]
  sweep: SweepRow[]
}
