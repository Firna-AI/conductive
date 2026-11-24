import { isRecord } from '../http'
import { machineHttpError } from './errors'

export type MachineOwner =
  | { kind: 'workspace'; orgId: string; workspaceId: string }
  | { kind: 'build'; orgId: string; buildId: string }
  | { kind: 'software-image'; imageId: string }

export function machineObjectName(owner: MachineOwner): string {
  switch (owner.kind) {
    case 'workspace':
      return `workspace:${owner.workspaceId}`
    case 'build':
      return `build:${owner.buildId}`
    case 'software-image':
      return `software-image:${owner.imageId}`
  }
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
  if (!isRecord(value)) return null
  switch (value.kind) {
    case 'workspace':
      return nonempty(value.orgId) && nonempty(value.workspaceId)
        ? {
            kind: value.kind,
            orgId: value.orgId,
            workspaceId: value.workspaceId,
          }
        : null
    case 'build':
      return nonempty(value.orgId) && nonempty(value.buildId)
        ? { kind: value.kind, orgId: value.orgId, buildId: value.buildId }
        : null
    case 'software-image':
      return nonempty(value.imageId)
        ? { kind: value.kind, imageId: value.imageId }
        : null
    default:
      return null
  }
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function sameOwner(left: MachineOwner, right: MachineOwner): boolean {
  const leftOrg = 'orgId' in left ? left.orgId : undefined
  const rightOrg = 'orgId' in right ? right.orgId : undefined
  return (
    leftOrg === rightOrg && machineObjectName(left) === machineObjectName(right)
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
