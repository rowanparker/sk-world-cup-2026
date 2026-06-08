import { useEffect, useState } from 'react'
import { loadWorldCupData } from '../api'
import type { WorldCupData } from '../types'

type State =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: WorldCupData; error: null }
  | { status: 'error'; data: null; error: Error }

/** Fetches all World Cup + sweep data once on mount. */
export function useWorldCupData(): State {
  const [state, setState] = useState<State>({
    status: 'loading',
    data: null,
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading', data: null, error: null })

    loadWorldCupData(controller.signal)
      .then((data) => setState({ status: 'ready', data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
        })
      })

    return () => controller.abort()
  }, [])

  return state
}
