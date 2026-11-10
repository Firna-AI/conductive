interface Waiting {
  grant(release: () => void): void
  signal: AbortSignal
  cancel(): void
}

/** Import operations share one control turn. Native device traffic stays separate. */
export function createImportScheduler() {
  const waiting: Waiting[] = []
  let occupied = false
  const next = () => {
    if (occupied) return
    const task = waiting.shift()
    if (!task) return
    if (task.signal.aborted) {
      task.cancel()
      next()
      return
    }
    occupied = true
    task.signal.removeEventListener('abort', task.cancel)
    let released = false
    task.grant(() => {
      if (released) return
      released = true
      occupied = false
      next()
    })
  }
  return {
    acquire(signal: AbortSignal): Promise<() => void> {
      signal.throwIfAborted()
      return new Promise((resolve, reject) => {
        const task: Waiting = {
          grant: resolve,
          signal,
          cancel() {
            const index = waiting.indexOf(task)
            if (index >= 0) waiting.splice(index, 1)
            reject(signal.reason)
            next()
          },
        }
        waiting.push(task)
        signal.addEventListener('abort', task.cancel, { once: true })
        next()
      })
    },
  }
}

export type ImportScheduler = ReturnType<typeof createImportScheduler>
