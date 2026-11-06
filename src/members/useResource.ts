import { useEffect, useState } from 'react'
import { errorMessage } from './api/client'

export type Resource<T> =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'ready'; value: T }

type Settled<T> = {
  load: () => Promise<T>
  attempt: number
  state: Resource<T>
}

/**
 * Loads data with `load`, again when `load` changes, and again on `retry`.
 * Wrap `load` in `useCallback`, so it changes only with its inputs. An
 * answer that comes after a newer load starts is dropped.
 */
export function useResource<T>(load: () => Promise<T>): {
  state: Resource<T>
  retry: () => void
} {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  useEffect(() => {
    let active = true
    load().then(
      (value) => {
        if (active)
          setSettled({ load, attempt, state: { status: 'ready', value } })
      },
      (reason: unknown) => {
        if (!active) return
        const message = errorMessage(reason)
        setSettled({ load, attempt, state: { status: 'failed', message } })
      },
    )
    return () => {
      active = false
    }
  }, [load, attempt])
  const current =
    settled !== null && settled.load === load && settled.attempt === attempt
  return {
    state: current ? settled.state : { status: 'loading' },
    retry: () => setAttempt((value) => value + 1),
  }
}
