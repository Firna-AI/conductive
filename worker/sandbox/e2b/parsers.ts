import { isRecord } from '../../http'
import type { Sandbox } from '../provider'
import { invalidResponse } from './errors'
import { sandboxId, secretToken, snapshotId } from './identity'

export function readSandbox(value: unknown, expected: string): Sandbox {
  if (!isRecord(value)) return invalidResponse()
  const id = sandboxId(value.sandboxID, expected)
  if (value.state === 'running') return { id, state: 'ready' }
  if (value.state === 'paused') {
    if (
      value.pauseMode !== undefined &&
      value.pauseMode !== 'full' &&
      value.pauseMode !== 'filesystem'
    )
      return invalidResponse()
    return {
      id,
      state: value.pauseMode === undefined ? 'archiving' : 'archived',
    }
  }
  return invalidResponse()
}

export function readAccess(value: unknown, expected?: string) {
  if (!isRecord(value)) return invalidResponse()
  return {
    sandboxId: sandboxId(value.sandboxID, expected),
    envdToken: secretToken(value.envdAccessToken),
    trafficToken: secretToken(value.trafficAccessToken),
  }
}

function readSnapshot(value: unknown): string {
  if (
    !isRecord(value) ||
    !Array.isArray(value.names) ||
    !value.names.every((name) => typeof name === 'string')
  )
    return invalidResponse()
  return snapshotId(value.snapshotID)
}

export function sandboxMatch(
  value: unknown,
  key: string,
  accountId: string,
): string | null {
  if (!isRecord(value) || !isRecord(value.metadata)) return invalidResponse()
  if (
    value.metadata.conductive_request !== key ||
    value.metadata.conductive_account !== accountId
  )
    return null
  if (value.state !== 'running' && value.state !== 'paused')
    return invalidResponse()
  return sandboxId(value.sandboxID)
}

export function snapshotMatch(value: unknown, name: string): string | null {
  const id = readSnapshot(value)
  if (!isRecord(value) || !Array.isArray(value.names)) return invalidResponse()
  return value.names.some(
    (candidate: unknown) =>
      typeof candidate === 'string' &&
      candidate.split('/').at(-1)?.split(':')[0] === name,
  )
    ? id
    : null
}
