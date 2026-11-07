import type { ActiveTurn } from './engine-session'

export function disposeProvider(
  turn: ActiveTurn,
  method: 'close' | 'stop' = 'close',
): Promise<void> {
  const previous = turn.closing
  const provider = turn.provider
  const lifetime = turn.lifetime
  if (!provider && !lifetime) return previous
  const closing = Promise.allSettled([
    previous,
    Promise.resolve().then(() => provider?.[method]()),
    Promise.resolve().then(() => lifetime?.close()),
  ]).then((results) => {
    const failed = results.find((result) => result.status === 'rejected')
    if (failed) throw failed.reason
  })
  turn.closing = closing
  turn.provider = null
  turn.lifetime = null
  return closing
}
