import { afterEach, expect, it, vi } from 'vitest'

import type { RunnerDiagnosticIdentity } from './runner-diagnostics'
import { TurnEndReports } from './turn-end-reports'

afterEach(() => vi.restoreAllMocks())

it('uses the runner current at commit and discards another workspace identity', () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const id = 'abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE'
  const original = {
    id,
    workspace: {
      id,
      orgId: 'org',
      tokenHash: 'private-token',
      archivedAt: null,
    },
    streamId: '12345678-1234-4234-8234-123456789abc',
    processStartId: 'abcdef01-2345-4678-89ab-cdef01234567',
    protocolVersion: 2,
  }
  let current: RunnerDiagnosticIdentity | null = original
  const reports = new TurnEndReports(
    async () => undefined,
    () => current,
  )
  const ended = [
    { turnId: id, occurredAt: 25, stateWithoutStop: 'finished' as const },
  ]
  current = {
    ...original,
    processStartId: 'fedcba98-7654-4321-8abc-def012345678',
  }
  reports.committed(id, ended)
  current = {
    ...original,
    workspace: { ...original.workspace, id: 'another-workspace' },
  }
  reports.committed(id, ended)
  current = null
  reports.committed(id, ended)
  const fields = {
    kind: 'turn_ended_without_stop_request',
    message: 'A turn ended without a Stop request.',
    workspaceId: id,
    turnId: id,
    state: 'finished',
  }
  const unavailable = {
    connectionId: null,
    streamId: null,
    processStartId: null,
    protocolVersion: null,
  }
  expect(warning.mock.calls).toEqual([
    [
      {
        ...fields,
        connectionId: id,
        streamId: original.streamId,
        processStartId: 'fedcba98-7654-4321-8abc-def012345678',
        protocolVersion: 2,
      },
    ],
    [{ ...fields, ...unavailable }],
    [{ ...fields, ...unavailable }],
  ])
})
