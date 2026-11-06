import { useState } from 'react'
import { useToast } from '@firna/ui/toast'
import type { ApiError } from '../../app/api/client'
import { asApiError } from '../../app/store'

export interface Action<A extends unknown[]> {
  run: (...args: A) => void
  pending: boolean
  error: ApiError | null
  reset: () => void
}

/**
 * Runs a write from a button, and keeps its state for the button: pending
 * while it runs, and the error when it fails. With `failure`, a failed
 * write also shows a toast that names what failed.
 */
export function useAction<A extends unknown[]>(
  write: (...args: A) => Promise<unknown>,
  failure?: string,
): Action<A> {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const { toast } = useToast()
  const run = (...args: A) => {
    if (pending) return
    setPending(true)
    setError(null)
    write(...args)
      .catch((cause: unknown) => {
        const problem = asApiError(cause)
        setError(problem)
        if (failure) {
          toast({ title: failure, description: problem.message, tone: 'error' })
        }
      })
      .finally(() => setPending(false))
  }
  return { run, pending, error, reset: () => setError(null) }
}
