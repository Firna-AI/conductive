import { isRecord } from '../http'
import { ProviderError } from './errors'
import {
  SANDBOX_STATES,
  type BoatAccount,
  type CommandResult,
  type CommandStatus,
  type Sandbox,
  type SavedSnapshot,
  type StartedCommand,
} from './provider'

function invalid(): never {
  throw new ProviderError('invalid_response', 502)
}

export function readAccount(
  value: Record<string, unknown>,
  expected?: BoatAccount,
): BoatAccount {
  if (value.type !== 'org.list' || !Array.isArray(value.orgs)) return invalid()
  // A replacement key can reach the saved wallet even when another wallet is active.
  if (
    expected &&
    value.orgs.some(
      (org: unknown) =>
        isRecord(org) && org.id === expected.id && org.type === expected.type,
    )
  ) {
    return expected
  }
  const active: unknown[] = value.orgs.filter(
    (org: unknown) => isRecord(org) && org.active === true,
  )
  if (active.length !== 1) return invalid()
  const account = active[0]
  if (
    !isRecord(account) ||
    typeof account.id !== 'string' ||
    !account.id ||
    (account.type !== 'org' && account.type !== 'personal')
  )
    return invalid()
  return { id: account.id, type: account.type }
}

export function readSandbox(value: Record<string, unknown>): Sandbox {
  const sandbox = value.sandbox
  if (!isRecord(sandbox) || typeof sandbox.id !== 'string' || !sandbox.id)
    return invalid()
  const state = SANDBOX_STATES.find((state) => state === sandbox.state)
  if (!state) return invalid()
  return { id: sandbox.id, state }
}

export function readSnapshot(value: Record<string, unknown>): SavedSnapshot {
  const snapshot = value.snapshot
  if (
    !isRecord(snapshot) ||
    typeof snapshot.name !== 'string' ||
    typeof snapshot.sourceSandboxId !== 'string' ||
    (snapshot.status !== 'saving' &&
      snapshot.status !== 'ready' &&
      snapshot.status !== 'failed')
  )
    return invalid()
  return {
    name: snapshot.name,
    sourceSandboxId: snapshot.sourceSandboxId,
    status: snapshot.status,
  }
}

export function readCommand(value: Record<string, unknown>): CommandResult {
  if (
    typeof value.stdout !== 'string' ||
    typeof value.stderr !== 'string' ||
    typeof value.timedOut !== 'boolean' ||
    (value.exitCode !== null &&
      (typeof value.exitCode !== 'number' || !Number.isInteger(value.exitCode)))
  )
    return invalid()
  return {
    stdout: value.stdout,
    stderr: value.stderr,
    exitCode: value.exitCode,
    timedOut: value.timedOut,
  }
}

export function readStartedCommand(
  value: Record<string, unknown>,
): StartedCommand {
  if (
    value.type !== 'command.started' ||
    value.success !== true ||
    !isOffset(value.processId) ||
    value.processId === 0
  )
    return invalid()
  return { processId: value.processId }
}

export function readCommandStatus(
  value: Record<string, unknown>,
  processId: number,
): CommandStatus {
  if (
    value.type !== 'command.status' ||
    typeof value.success !== 'boolean' ||
    value.processId !== processId ||
    (value.status !== 'running' &&
      value.status !== 'exited' &&
      value.status !== 'lost') ||
    typeof value.running !== 'boolean' ||
    (value.exitCode !== null &&
      (typeof value.exitCode !== 'number' ||
        !Number.isSafeInteger(value.exitCode))) ||
    (value.timedOut !== undefined &&
      value.timedOut !== null &&
      typeof value.timedOut !== 'boolean') ||
    typeof value.stdout !== 'string' ||
    typeof value.stderr !== 'string' ||
    !isOffset(value.stdoutOffset) ||
    !isOffset(value.stderrOffset) ||
    !isOffset(value.stdoutNextOffset) ||
    !isOffset(value.stderrNextOffset) ||
    value.stdoutNextOffset < value.stdoutOffset ||
    value.stderrNextOffset < value.stderrOffset ||
    typeof value.more !== 'boolean'
  )
    return invalid()
  return {
    processId,
    state: value.status,
    running: value.running,
    exitCode: value.exitCode,
    timedOut: value.timedOut ?? null,
    stdout: value.stdout,
    stderr: value.stderr,
    stdoutOffset: value.stdoutOffset,
    stderrOffset: value.stderrOffset,
    stdoutNextOffset: value.stdoutNextOffset,
    stderrNextOffset: value.stderrNextOffset,
    more: value.more,
  }
}

function isOffset(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
