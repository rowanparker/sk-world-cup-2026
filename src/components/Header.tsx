interface HeaderProps {
  peopleCount: number
  teamCount: number
}

export function Header({ peopleCount, teamCount }: HeaderProps) {
  return (
    <header className="header">
      <img
        className="header__logo"
        src={`${import.meta.env.BASE_URL}sk-logo.webp`}
        alt="Sidekicker, in partnership with SEEK"
      />
      <div className="header__titles">
        <h1 className="header__title">
          World Cup 2026 <span className="header__accent">Sweeps</span>
        </h1>
        <p className="header__subtitle">
          {peopleCount} players · {teamCount} nations · USA · Canada · Mexico
        </p>
      </div>
    </header>
  )
}
