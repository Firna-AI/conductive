import { isRecord } from '../http'
import { machineHttpError } from './errors'

export interface MachineOwner {
  kind: 'workspace'
  orgId: string
  workspaceId: string
}

export function machineObjectName(owner: MachineOwner): string {
  return `workspace:${owner.workspaceId}`
}

export interface MachineRecord {
  owner: MachineOwner
  digest: string | null
  generation: number
  hello: {
    hostProtocolVersion: number
    programVersion: string
    at: number
  } | null
}

export function readOwner(value: unknown): MachineOwner | null {
  if (
    !isRecord(value) ||
    value.kind !== 'workspace' ||
    typeof value.orgId !== 'string' ||
    !value.orgId ||
    typeof value.workspaceId !== 'string' ||
    !value.workspaceId
  )
    return null
  return {
    kind: 'workspace',
    orgId: value.orgId,
    workspaceId: value.workspaceId,
  }
}

export function sameOwner(left: MachineOwner, right: MachineOwner): boolean {
  return (
    left.kind === right.kind &&
    left.orgId === right.orgId &&
    left.workspaceId === right.workspaceId
  )
}

export function readMachineRecord(value: unknown): MachineRecord | null {
  if (!isRecord(value)) return null
  const owner = readOwner(value.owner)
  if (
    !owner ||
    !(value.digest === null || typeof value.digest === 'string') ||
    typeof value.generation !== 'number' ||
    !Number.isSafeInteger(value.generation) ||
    value.generation < 1
  )
    return null
  const hello = value.hello
  if (hello === null)
    return {
      owner,
      digest: value.digest,
      generation: value.generation,
      hello: null,
    }
  if (
    !isRecord(hello) ||
    typeof hello.hostProtocolVersion !== 'number' ||
    typeof hello.programVersion !== 'string' ||
    typeof hello.at !== 'number'
  )
    return null
  return {
    owner,
    digest: value.digest,
    generation: value.generation,
    hello: {
      hostProtocolVersion: hello.hostProtocolVersion,
      programVersion: hello.programVersion,
      at: hello.at,
    },
  }
}

export function requireOwner(
  record: MachineRecord | null,
  owner: MachineOwner,
): void {
  if (!record || !sameOwner(record.owner, owner))
    throw machineHttpError(
      404,
      'machine_not_found',
      'The cloud computer is not available.',
    )
}
