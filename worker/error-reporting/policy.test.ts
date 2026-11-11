import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { WarningId, errorSummary } from '../warning-values'
import { CommandFailed } from '../warnings'
import { cleanupBusy } from '../members/cleanup-lease'
import { WorkspaceStartError } from '../lifecycle/workspace-start'
import { warnArchiveFailure } from '../lifecycle/archive-failure'
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
    captureWorkerWarning({
      kind: 'git_credential_failed',
      workspaceId: WarningId.checked(id),
      turn: true,
      error: errorSummary(error),
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
  const archive = reportingFixture()
  withWorkerErrorScope(archive.runtime, { component: 'workspace' }, () => {
    const error = reportingError()
    warnArchiveFailure({ workspaceId: id, phase: 'purge' }, error)
    captureUnexpectedWorkerFailure('org_cleanup_failed', error)
  })
  await flushReporting(archive.runtime)
  expect(archive.envelopes).toHaveLength(1)
  expect(archive.envelopes[0][1][0][1]).toMatchObject({
    tags: {
      classification: 'workspace_archive_failed',
      'warning.phase': 'purge',
      'warning.errorKind': 'error',
    },
  })
  expect(archive.serialized()).not.toContain(id)
  expect(archive.serialized()).not.toContain('private')
})
