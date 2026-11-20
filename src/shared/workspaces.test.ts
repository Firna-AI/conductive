import { expect, it } from 'vitest'

import { workspaceRemovedAt } from './workspaces'

it('returns the removal time from the end of the archive window, including its exact boundary', () => {
  for (const [archivedAt, now, removedAt] of [
    [null, 1_209_600_100, null],
    [100, 1_209_600_099, null],
    [100, 1_209_600_100, 1_209_600_100],
    [100, 1_209_600_101, 1_209_600_100],
    [0, 1_209_600_000, 1_209_600_000],
  ] as const)
    expect(workspaceRemovedAt(archivedAt, now), `${archivedAt} at ${now}`).toBe(
      removedAt,
    )
})
