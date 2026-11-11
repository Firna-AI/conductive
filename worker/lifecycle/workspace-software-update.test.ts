import { expect, it } from 'vitest'

import { softwareUpdateOutcome } from './workspace-software-update'
import { WorkspaceStartError } from './workspace-start'

it('rejects update results that cannot prove a completed rollback', () => {
  const statuses = [
    { state: 'exited', exitCode: 1, timedOut: true },
    { state: 'exited', exitCode: null, timedOut: false },
    { state: 'exited', exitCode: 137, timedOut: false },
    { state: 'exited', exitCode: 125, timedOut: false },
  ] as const
  for (const status of statuses)
    expect(
      () => softwareUpdateOutcome(status),
      JSON.stringify(status),
    ).toThrowError(WorkspaceStartError)
})
