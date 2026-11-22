import { afterEach, expect, it, vi } from 'vitest'

import { WarningId } from './warning-values'
import { warnWorker } from './warnings'

afterEach(() => vi.restoreAllMocks())

it('logs only the closed Continue cause and phase and excludes private caller fields', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const marker = 'private_continue_output'
  const workspaceId = 'w'.repeat(43)
  const warning = {
    kind: 'workspace_continue_ended' as const,
    workspaceId: WarningId.checked(workspaceId),
    phase: 'move' as const,
    stopCause: 'index-lock' as const,
    message: marker,
    stdout: marker,
    stderr: marker,
    error: new Error(marker),
  }
  warnWorker(warning)
  Object.defineProperties(warning, {
    phase: { value: marker },
    stopCause: { value: marker },
    workspaceId: { value: WarningId.checked(marker) },
  })
  warnWorker(warning)
  expect(warn.mock.calls).toEqual([
    [
      {
        kind: 'workspace_continue_ended',
        message: 'Continue ended as failed.',
        workspaceId,
        phase: 'move',
        stopCause: 'index-lock',
      },
    ],
    [
      {
        kind: 'workspace_continue_ended',
        message: 'Continue ended as failed.',
        workspaceId: 'unknown',
        phase: 'unknown',
        stopCause: 'unknown',
      },
    ],
  ])
  expect(JSON.stringify(warn.mock.calls)).not.toContain(marker)
})
