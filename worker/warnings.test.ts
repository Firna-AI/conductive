import { afterEach, expect, it, vi } from 'vitest'

import { HttpError } from './http'
import { ProviderError } from './sandbox/errors'
import { errorSummary, WarningId } from './warning-values'
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
