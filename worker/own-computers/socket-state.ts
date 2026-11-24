import { isRecord } from '../http'
import type { ComputerOwner } from './identity'
import { unsigned32 } from './operations'

export interface ComputerSocketState extends ComputerOwner {
  digest: string
  ready: boolean
  lastId: number
}

export function readComputerSocketState(
  value: unknown,
): ComputerSocketState | null {
  if (
    !isRecord(value) ||
    typeof value.orgId !== 'string' ||
    typeof value.computerId !== 'string' ||
    typeof value.digest !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(value.digest) ||
    typeof value.ready !== 'boolean' ||
    !unsigned32(value.lastId)
  )
    return null
  return {
    orgId: value.orgId,
    computerId: value.computerId,
    digest: value.digest,
    ready: value.ready,
    lastId: value.lastId,
  }
}
