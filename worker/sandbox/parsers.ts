import { isRecord } from '../http'
import { ProviderError } from './errors'
import {
  SANDBOX_STATES,
  type BoatAccount,
  type CommandResult,
  type Sandbox,
  type SavedSnapshot,
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
