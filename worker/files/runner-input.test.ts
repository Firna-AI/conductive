import { expect, it } from 'vitest'

import { parseRunnerFileEvent } from './runner-input'

it('refuses omission metadata outside the non-negative safe integer range', () => {
  const part = { revision: 1, partNumber: 1, partCount: 1 }
  const changes = {
    ...part,
    baseBranch: 'main',
    files: [],
    summary: { files: 0, added: 0, removed: 0 },
  }
  const cases = [
    {
      type: 'files.snapshot',
      tree: { ...part, entries: [], omittedEntryCount: -1 },
    },
    {
      type: 'files.changed',
      delta: { revision: 2, changes: [], omittedEntryCount: 0.5 },
    },
    {
      type: 'changes.updated',
      changes: {
        ...changes,
        omitted: { files: 1, added: 0, removed: 2 ** 53 },
      },
    },
    { type: 'changes.updated', changes: { ...changes, omitted: null } },
  ]
  for (const event of cases) {
    expect
      .soft(() => parseRunnerFileEvent(event), JSON.stringify(event))
      .toThrow(
        expect.objectContaining({ status: 502, code: 'file_unavailable' }),
      )
  }
})
