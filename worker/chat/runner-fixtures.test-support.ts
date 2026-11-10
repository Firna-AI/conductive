import { parseRunnerTransport } from './runner-input'

export const context = { sessionId: 'session', turnId: 'turn' }
/** @public Shared by the history compaction and ordering fixtures. */
export const choice = {
  agent: 'claude',
  model: 'test',
  effort: 'high',
} as const
export const file = (path: string) => ({
  path,
  name: path.split('/').at(-1) ?? path,
  kind: 'file' as const,
  change: null,
})
export const snapshot = (
  revision: number,
  partNumber: number,
  partCount: number,
  paths: string[],
) => ({
  type: 'files.snapshot' as const,
  tree: { revision, partNumber, partCount, entries: paths.map(file) },
})

export function numberedRunnerInput(value: unknown) {
  const input = parseRunnerTransport(value)
  if (input.type !== 'event')
    throw new Error('Expected a numbered runner event.')
  return input
}
