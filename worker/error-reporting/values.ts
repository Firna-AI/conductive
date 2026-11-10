import type { WorkerWarning } from '../warning-types'
import type { ErrorSummary } from '../warning-values'
import type { BuildPhase } from '../lifecycle/build-data'
import type { WorkspaceStartJob } from '../lifecycle/start-types'
import { knownWorkerErrorCode } from './codes'

const phases = {
  records: true,
  machine: true,
  ready: true,
  fetch: true,
  branch: true,
  startup: true,
  terminal: true,
  'terminal-password': true,
  runner: true,
  create: true,
  allocating: true,
  sources: true,
  software: true,
  install: true,
  snapshot: true,
  publish: true,
  cleanup: true,
  'cleanup-build': true,
  done: true,
} satisfies Record<BuildPhase | WorkspaceStartJob['phase'], true>
const enums: Readonly<Record<string, readonly string[]>> = {
  phase: Object.keys(phases),
  errorKind: ['provider', 'http', 'command', 'error', 'unknown'],
  providerKind: [
    'unauthorized',
    'forbidden',
    'payment_required',
    'not_found',
    'conflict',
    'rate_limited',
    'unavailable',
    'invalid_response',
    'invalid_request',
    'unknown',
  ],
  commandState: ['running', 'exited', 'lost', 'unknown'],
  resource: ['workspace', 'org'],
}
const numbers = new Set(['exitCode', 'limit', 'workspaces', 'orgs', 'status'])
const booleans = new Set(['timedOut', 'cancelled'])

type Values = Record<string, unknown>

function summaryValues(summary: ErrorSummary): Values {
  switch (summary.kind) {
    case 'provider':
      return {
        errorKind: summary.kind,
        providerKind: summary.providerKind,
        status: summary.status,
        code: summary.code,
      }
    case 'http':
      return {
        errorKind: summary.kind,
        status: summary.status,
        code: summary.code,
      }
    case 'command':
      return {
        errorKind: summary.kind,
        commandState: summary.state,
        exitCode: summary.exitCode,
        timedOut: summary.timedOut,
      }
    default:
      return { errorKind: summary.kind }
  }
}

function warningValues(warning: WorkerWarning): Values {
  switch (warning.kind) {
    case 'terminal_start_failed':
      return { exitCode: warning.exitCode, timedOut: warning.timedOut }
    case 'workspace_start_failed':
    case 'image_build_failed':
      return { phase: warning.phase, ...summaryValues(warning.error) }
    case 'workspace_title_request_failed':
    case 'workspace_title_save_failed':
    case 'workspace_first_message_failed':
    case 'runner_message_failed':
      return summaryValues(warning.error)
    case 'workspace_start_ended':
      return {
        phase: warning.phase,
        code: warning.code,
        cancelled: warning.cancelled,
      }
    case 'lifecycle_repair_limited':
      return { resource: warning.resource, limit: warning.limit }
    case 'lifecycle_repair_pending':
      return { workspaces: warning.workspaces, orgs: warning.orgs }
    default:
      return {}
  }
}

export function workerWarningTags(
  warning: WorkerWarning,
): Record<string, string> {
  const tags: Record<string, string> = {}
  for (const [key, value] of Object.entries(warningValues(warning))) {
    let kept: string | undefined
    if (key === 'code') kept = knownWorkerErrorCode(value)
    else if (
      numbers.has(key) &&
      typeof value === 'number' &&
      Number.isSafeInteger(value)
    )
      kept = String(value)
    else if (booleans.has(key) && typeof value === 'boolean')
      kept = String(value)
    else if (typeof value === 'string' && enums[key]?.includes(value))
      kept = value
    if (kept !== undefined) tags[`warning.${key}`] = kept
  }
  return tags
}
