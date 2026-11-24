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

it('keeps the Boat code that says why a resume failed', () => {
  expect(
    errorSummary(new ProviderError('conflict', 409, 'resume_failed')),
  ).toEqual({
    kind: 'provider',
    providerKind: 'conflict',
    status: 409,
    code: 'resume_failed',
  })
})

it('keeps a known HTTP code and drops arbitrary codes, error names, and messages', () => {
  for (const code of [
    'workspace_start_failed',
    'image_sources_unavailable',
    'github_unavailable',
  ])
    expect(errorSummary(new HttpError(502, code, marker))).toEqual({
      kind: 'http',
      status: 502,
      code,
    })
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

it('validates source failure fields and drops private image build fields', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const warning = {
    kind: 'image_build_failed' as const,
    buildId: WarningId.checked(marker),
    phase: 'sources' as const,
    sourceStep: 'metadata_read' as const,
    githubStatus: 403,
    error: errorSummary(
      new HttpError(502, 'image_sources_unavailable', marker),
    ),
    token: marker,
    repositoryName: marker,
    responseText: marker,
  }
  warnWorker(warning)
  warnWorker({ ...warning, phase: 'software' })
  Reflect.set(warning, 'sourceStep', marker)
  Reflect.set(warning, 'githubStatus', 403.5)
  warnWorker(warning)
  const base = {
    kind: 'image_build_failed',
    buildId: 'unknown',
    message: 'An image build failed.',
    error: { kind: 'http', status: 502, code: 'image_sources_unavailable' },
  }
  expect(warn.mock.calls).toEqual([
    [
      {
        ...base,
        phase: 'sources',
        sourceStep: 'metadata_read',
        githubStatus: 403,
      },
    ],
    [{ ...base, phase: 'software', sourceStep: null, githubStatus: null }],
    [{ ...base, phase: 'sources', sourceStep: 'unknown', githubStatus: null }],
  ])
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
  const processStartId = 'abcdef01-2345-4678-89ab-cdef01234567'
  const warning = {
    kind: 'runner_connected' as const,
    workspaceId: WarningId.checked(productionId),
    connectionId: WarningId.checked(productionId),
    streamId: WarningStreamId.checked(streamId),
    processStartId: WarningStreamId.checked(processStartId),
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
    processStartId: WarningStreamId.checked(marker),
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
        processStartId,
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
        processStartId: 'unknown',
        protocolVersion: null,
        turnId: 'unknown',
        state: 'failed',
      },
    ],
  ])
  expect(warningTurnEndState(marker)).toBe('unknown')
})

it('logs checked runner work values and replaces runner text that fails its check', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const work = {
    kind: 'runner_work_interrupted' as const,
    workspaceId: WarningId.checked('w'.repeat(43)),
    connectionId: WarningId.checked(marker),
    streamId: null,
    processStartId: null,
    protocolVersion: 2,
    work: 'event' as const,
    stage: 'after_commit' as const,
    eventType: 'tool.updated',
    eventNumber: 7,
    size: 512,
  }
  const withPrivate = { ...work, private: marker }
  warnWorker(withPrivate)
  warnWorker({
    ...work,
    eventType: `${marker} with spaces`,
    eventNumber: -1,
    size: 1.5,
  })
  expect(warn.mock.calls).toEqual([
    [
      {
        kind: 'runner_work_interrupted',
        message: 'The work of a runner message did not finish.',
        workspaceId: 'w'.repeat(43),
        connectionId: 'unknown',
        streamId: null,
        processStartId: null,
        protocolVersion: 2,
        work: 'event',
        stage: 'after_commit',
        eventType: 'tool.updated',
        eventNumber: 7,
        size: 512,
      },
    ],
    [
      {
        kind: 'runner_work_interrupted',
        message: 'The work of a runner message did not finish.',
        workspaceId: 'w'.repeat(43),
        connectionId: 'unknown',
        streamId: null,
        processStartId: null,
        protocolVersion: 2,
        work: 'event',
        stage: 'after_commit',
        eventType: 'unknown',
        eventNumber: null,
        size: null,
      },
    ],
  ])
})
