import { useState } from 'react'
import { CompletedMatches } from './components/CompletedMatches'
import { Finals } from './components/Finals'
import { Header } from './components/Header'
import { MatchSchedule } from './components/MatchSchedule'
import { NextMatch } from './components/NextMatch'
// "The Sweep" section is hidden for now — keep the import for when it returns.
// import { PeopleGrid } from './components/PeopleGrid'
import { Prizes } from './components/Prizes'
import { useWorldCupData } from './hooks/useWorldCupData'

export default function App() {
  const { status, data, error } = useWorldCupData()
  // Per-person filtering was driven by "The Sweep"; with it hidden, nothing
  // selects a person, so the schedule shows everyone.
  const [selectedPerson] = useState<string | null>(null)

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
            <NextMatch
              matches={data.matches}
              teams={data.teams}
              sweep={data.sweep}
            />
            <Prizes matches={data.matches} sweep={data.sweep} />
            <Finals
              matches={data.matches}
              teams={data.teams}
              sweep={data.sweep}
            />
            <CompletedMatches
              matches={data.matches}
              teams={data.teams}
              sweep={data.sweep}
            />
            {/* "The Sweep" section hidden for now — kept for future use.
            <PeopleGrid
              sweep={data.sweep}
              selectedPerson={selectedPerson}
              onSelect={setSelectedPerson}
            />
            */}
            <MatchSchedule
              matches={data.matches}
              teams={data.teams}
              sweep={data.sweep}
              selectedPerson={selectedPerson}
            />
          </>
        )}
      </main>

      <footer className="footer">
        <p className="footer__note">
          <strong>How “Last” is worked out:</strong> from the results so far, each
          sweeper’s team is ranked by how far it has gone — knockout rounds
          survived first, then group-stage points, goal difference and goals
          scored. The team sitting bottom of that list is shown as the estimated
          last place. It updates as more matches are played, so it can move
          around until the tournament is done.
        </p>
        <p>
          Sidekicker World Cup 2026 Sweeps · data from{' '}
          <a
            href="https://github.com/openfootball/worldcup.json"
            target="_blank"
            rel="noreferrer"
          >
            openfootball
          </a>
        </p>
      </footer>
    </div>
  )
}
