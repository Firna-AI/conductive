import type { SessionRuntime } from './engine-session'

export function disposeProvider(
  session: SessionRuntime,
  method: 'close' | 'stop' = 'close',
): Promise<void> {
  const turn = session.active
  const previous = turn?.closing ?? Promise.resolve()
  const provider = session.provider
  if (!provider) return previous
  const closing = Promise.allSettled([
    previous,
    Promise.resolve().then(() => provider[method]()),
  ]).then((results) => {
    const failed = results.find((result) => result.status === 'rejected')
    if (failed) throw failed.reason
  })
  if (turn) turn.closing = closing
  session.provider = null
  return closing
}
