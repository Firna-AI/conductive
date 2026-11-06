export type PauseOutcome<T> =
  { type: 'paused' } | { type: 'completed'; value: T }

function signal() {
  let resolve = () => {}
  const promise = new Promise<void>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

/** Race each operation against its next pause entry, including unexpected competing entries. */
export function testPause() {
  const released = signal()
  let nextEntry = signal()
  return {
    wait() {
      const entered = nextEntry
      nextEntry = signal()
      entered.resolve()
      return released.promise
    },
    release: released.resolve,
    start<T>(start: () => Promise<T>) {
      const entry = nextEntry.promise
      const operation = start()
      const outcome: Promise<PauseOutcome<T>> = Promise.race([
        entry.then<PauseOutcome<T>>(() => ({ type: 'paused' })),
        operation.then<PauseOutcome<T>>((value) => ({
          type: 'completed',
          value,
        })),
      ])
      return { operation, outcome }
    },
  }
}
