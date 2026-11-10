import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { WarningId, errorSummary } from '../warning-values'
import { CommandFailed } from '../warnings'
import { cleanupBusy } from '../members/cleanup-lease'
import { WorkspaceStartError } from '../lifecycle/workspace-start'
import { userCommandFailure } from './causes'
import { captureUnexpectedWorkerFailure, captureWorkerWarning } from './policy'
import {
  flushReporting,
  reportingError,
  reportingFixture,
} from './reporting.test-support'
import { withWorkerErrorScope } from './scope'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
})
afterEach(() => vi.useRealTimers())

it('reports typed safe warning values and keeps IDs, normal refusals, user scripts, and duplicates silent', async () => {
  const fixture = reportingFixture()
  const id = 'abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE'
  const error = reportingError()
  withWorkerErrorScope(fixture.runtime, { component: 'workspace' }, () => {
    captureWorkerWarning(
      {
        kind: 'workspace_start_failed',
        workspaceId: WarningId.checked(id),
        phase: 'startup',
        error: errorSummary(error),
      },
      error,
    )
    captureUnexpectedWorkerFailure('workspace_alarm_failed', error)
    captureUnexpectedWorkerFailure('org_cleanup_failed', cleanupBusy())
    const user = userCommandFailure(new WorkspaceStartError(null))
    captureWorkerWarning(
      {
        kind: 'workspace_start_failed',
        workspaceId: WarningId.checked(id),
        phase: 'startup',
        error: errorSummary(user),
      },
      user,
    )
    const install = new CommandFailed('exited', 1, false)
    captureWorkerWarning(
      {
        kind: 'image_build_failed',
        buildId: WarningId.checked(id),
        phase: 'install',
        error: errorSummary(install),
      },
      install,
    )
    captureWorkerWarning(
      {
        kind: 'runner_message_failed',
        workspaceId: WarningId.checked(id),
        error: errorSummary(error),
      },
      error,
    )
    captureWorkerWarning({
      kind: 'runner_protocol_version_mismatch',
      workspaceId: WarningId.checked(id),
    })
  })
  await flushReporting(fixture.runtime)
  expect(fixture.envelopes).toHaveLength(1)
  expect(fixture.envelopes[0][1][0][1]).toMatchObject({
    tags: {
      classification: 'workspace_start_failed',
      'warning.phase': 'startup',
      'warning.errorKind': 'error',
    },
  })
  expect(fixture.serialized()).not.toContain(id)
  expect(fixture.serialized()).not.toContain('private')
})
