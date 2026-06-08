import { Header } from './components/Header'
import { MatchSchedule } from './components/MatchSchedule'
import { PeopleGrid } from './components/PeopleGrid'
import { useWorldCupData } from './hooks/useWorldCupData'

export default function App() {
  const { status, data, error } = useWorldCupData()

  return (
    <div className="app">
      <Header
        peopleCount={data?.sweep.length ?? 0}
        teamCount={data?.teams.length ?? 0}
      />

      <main className="content">
        {status === 'loading' && (
          <div className="state state--loading" role="status">
            <span className="spinner" aria-hidden="true" />
            Loading World Cup data…
          </div>
        )}

        {status === 'error' && (
          <div className="state state--error" role="alert">
            <strong>Couldn’t load the data.</strong>
            <span>{error.message}</span>
          </div>
        )}

        {status === 'ready' && (
          <>
            <PeopleGrid sweep={data.sweep} />
            <MatchSchedule
              matches={data.matches}
              teams={data.teams}
              sweep={data.sweep}
            />
          </>
        )}
      </main>

      <footer className="footer">
        Sidekicker World Cup 2026 Sweeps · data from{' '}
        <a
          href="https://github.com/openfootball/worldcup.json"
          target="_blank"
          rel="noreferrer"
        >
          openfootball
        </a>
      </footer>
    </div>
  )
}
