import type { WorkspaceStartResult } from './start-types'

type AbortedStart = Extract<WorkspaceStartResult<null>, { ok: false }>

export function abortStartWaiters(
  ...waiters: { publish(result: AbortedStart): void }[]
): void {
  const result: AbortedStart = {
    ok: false,
    error: {
      code: 'org_not_found',
      message: 'The org is not available.',
      log: null,
    },
  }
  for (const waiter of waiters) waiter.publish(result)
}

/** Register before reading durable storage so completion cannot lose a waiter. */
export class StartWaiters<T> {
  private readonly listeners = new Set<(result: T) => void>()

  wait(read: () => Promise<T | undefined>): Promise<T> {
    return new Promise((resolve, reject) => {
      const receive = (result: T) => {
        this.listeners.delete(receive)
        resolve(result)
      }
      this.listeners.add(receive)
      void read().then(
        (result) => {
          if (result) receive(result)
        },
        (error: unknown) => {
          this.listeners.delete(receive)
          reject(error)
        },
      )
    })
  }

  publish(result: T): void {
    for (const listener of this.listeners) listener(result)
  }
}
