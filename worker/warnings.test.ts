import { afterEach, expect, it, vi } from 'vitest'

import { HttpError } from './http'
import { ProviderError } from './sandbox/errors'
import {
  errorSummary,
  WarningId,
  WarningStreamId,
  warningTurnEndState,
} from './warning-values'
import { CommandFailed, warnWorker } from './warnings'

const marker = 'private_command_output'
afterEach(() => vi.restoreAllMocks())

it('keeps only the kind, the status, and a known code of a provider error', () => {
  expect(
    errorSummary(new ProviderError('invalid_request', 400, 'invalid_path')),
  ).toEqual({
    kind: 'provider',
    providerKind: 'invalid_request',
    status: 400,
    code: 'invalid_path',
  })
  expect(
    errorSummary(new ProviderError('invalid_request', 400, marker)),
  ).toEqual({
    kind: 'provider',
    providerKind: 'invalid_request',
    status: 400,
    code: null,
  })
})

it('keeps a known HTTP code and drops arbitrary codes, error names, and messages', () => {
  expect(
    errorSummary(new HttpError(502, 'workspace_start_failed', marker)),
  ).toEqual({ kind: 'http', status: 502, code: 'workspace_start_failed' })
  expect(errorSummary(new HttpError(409, marker, marker))).toEqual({
    kind: 'http',
    status: 409,
    code: 'unknown',
  })
  class PrivateError extends Error {}
  Object.defineProperty(PrivateError, 'name', { value: marker })
  expect(errorSummary(new PrivateError(marker))).toEqual({ kind: 'error' })
  expect(errorSummary(new Error(`password=${marker}`))).toEqual({
    kind: 'error',
  })
  expect(errorSummary(new TypeError(marker))).toEqual({ kind: 'error' })
  expect(errorSummary(marker)).toEqual({ kind: 'unknown' })
})

it('describes a failed command by its state and numbers only', () => {
  expect(errorSummary(new CommandFailed('exited', 2, false))).toEqual({
    kind: 'command',
    state: 'exited',
    exitCode: 2,
    timedOut: false,
  })
  expect(errorSummary(new CommandFailed(marker, null, true))).toEqual({
    kind: 'command',
    state: 'unknown',
    exitCode: null,
    timedOut: true,
  })
})

it('logs checked production IDs and replaces command output used as an ID', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const productionId = 'abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE'
  for (const id of [productionId, 'password=private_command_output'])
    warnWorker({
      kind: 'terminal_start_failed',
      workspaceId: WarningId.checked(id),
      exitCode: 2,
      timedOut: false,
    })
  expect(warn.mock.calls).toEqual([
    [
      {
        kind: 'terminal_start_failed',
        message: 'The terminal of a workspace did not start.',
        workspaceId: productionId,
        exitCode: 2,
        timedOut: false,
      },
    ],
    [
      {
        kind: 'terminal_start_failed',
        message: 'The terminal of a workspace did not start.',
        workspaceId: 'unknown',
        exitCode: 2,
        timedOut: false,
      },
    ],
  ])
})

it('logs only declared fields when a typed warning has extra caller fields', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const warning = {
    kind: 'workspace_start_failed' as const,
    workspaceId: WarningId.checked(marker),
    phase: 'startup' as const,
    error: {
      ...errorSummary(new HttpError(502, 'workspace_start_failed', marker)),
      message: marker,
    },
    message: marker,
    stdout: marker,
  }
  warnWorker(warning)
  expect(warn.mock.calls).toEqual([
    [
      {
        kind: 'workspace_start_failed',
        message: 'A workspace start failed.',
        workspaceId: 'unknown',
        phase: 'startup',
        error: { kind: 'http', status: 502, code: 'workspace_start_failed' },
      },
    ],
  ])
})

it('keeps checked runner identities and strips private fields and invalid diagnostic values', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const productionId = 'abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE'
  const streamId = '12345678-1234-4234-8234-123456789abc'
  const warning = {
    kind: 'runner_connected' as const,
    workspaceId: WarningId.checked(productionId),
    connectionId: WarningId.checked(productionId),
    streamId: WarningStreamId.checked(streamId),
    protocolVersion: 2,
    token: marker,
    message: marker,
    fileContent: marker,
    closeReason: marker,
  }
  warnWorker(warning)
  warnWorker({
    ...warning,
    kind: 'turn_ended_without_stop_request',
    turnId: WarningId.checked(marker),
    state: 'failed',
    streamId: WarningStreamId.checked(marker),
    protocolVersion: Number.POSITIVE_INFINITY,
  })
  expect(warn.mock.calls).toEqual([
    [
      {
        kind: 'runner_connected',
        message: 'The runner of a workspace connected.',
        workspaceId: productionId,
        connectionId: productionId,
        streamId,
        protocolVersion: 2,
      },
    ],
    [
      {
        kind: 'turn_ended_without_stop_request',
        message: 'A turn ended without a Stop request.',
        workspaceId: productionId,
        connectionId: productionId,
        streamId: 'unknown',
        protocolVersion: null,
        turnId: 'unknown',
        state: 'failed',
      },
    ],
  ])
  expect(warningTurnEndState(marker)).toBe('unknown')
})
