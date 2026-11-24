import type { ComputerOperation } from '../../src/shared/generated/ComputerOperation'
import type { ComputerRelease } from '../../src/shared/generated/ComputerRelease'
import type { ComputerResult } from '../../src/shared/generated/ComputerResult'
import type { ContainerEnvVar } from '../../src/shared/generated/ContainerEnvVar'
import type { ContainerImage } from '../../src/shared/generated/ContainerImage'
import { isRecord } from '../http'
import { count } from '../machines/protocol-reader'
import { invalidOperation } from './errors'

const namePattern = /^[a-z0-9][a-z0-9-]{0,62}$/
const versionPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/

export const maxRequestId = 0xffff_ffff

export function unsigned32(value: unknown): value is number {
  return count(value) && value <= maxRequestId
}

export function containerName(value: unknown): value is string {
  return typeof value === 'string' && namePattern.test(value)
}

export function plainVersion(value: unknown): value is string {
  return typeof value === 'string' && versionPattern.test(value)
}

function readRelease(value: unknown): ComputerRelease {
  if (
    !isRecord(value) ||
    !plainVersion(value.version) ||
    typeof value.digest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(value.digest)
  )
    throw invalidOperation()
  return { version: value.version, digest: value.digest }
}

function readImage(value: unknown): ContainerImage {
  if (!isRecord(value)) throw invalidOperation()
  if (value.kind === 'base')
    return { kind: 'base', release: readRelease(value.release) }
  if (value.kind === 'org' && containerName(value.name))
    return { kind: 'org', name: value.name }
  throw invalidOperation()
}

function readEnv(value: unknown): readonly ContainerEnvVar[] {
  if (!Array.isArray(value)) throw invalidOperation()
  return Array.from(value, (entry: unknown) => {
    if (
      !isRecord(entry) ||
      typeof entry.name !== 'string' ||
      !/^[A-Za-z_][A-Za-z0-9_]*$/.test(entry.name) ||
      typeof entry.value !== 'string' ||
      entry.value.includes('\0')
    )
      throw invalidOperation()
    return { name: entry.name, value: entry.value }
  })
}

/** Retain only the fields of the fixed operation that goes to the computer. */
export function readComputerOperation(value: unknown): ComputerOperation {
  if (!isRecord(value)) throw invalidOperation()
  const { kind, container } = value
  if (!containerName(container)) throw invalidOperation()
  switch (kind) {
    case 'container.create': {
      const { cpus, memoryBytes } = value
      if (
        !unsigned32(cpus) ||
        cpus < 1 ||
        !count(memoryBytes) ||
        memoryBytes < 1
      )
        throw invalidOperation()
      return {
        kind,
        container,
        image: readImage(value.image),
        env: readEnv(value.env),
        cpus,
        memoryBytes,
      }
    }
    case 'container.get':
    case 'container.stop':
    case 'container.delete':
      return { kind, container }
    case 'container.start':
      return { kind, container, env: readEnv(value.env) }
    case 'image.save':
      if (!containerName(value.image)) throw invalidOperation()
      return { kind, container, image: value.image }
    case 'container.bootstrap':
      return { kind, container, release: readRelease(value.release) }
    default:
      throw invalidOperation()
  }
}

export type ComputerSuccess = Exclude<ComputerResult, { kind: 'error' }>

export function matchComputerReply(
  operation: ComputerOperation,
): (result: ComputerSuccess) => boolean {
  const { container } = operation
  switch (operation.kind) {
    case 'container.create':
    case 'container.get':
    case 'container.start':
    case 'container.stop':
      return (result) =>
        result.kind === 'container' && result.container === container
    case 'container.delete':
      return (result) =>
        result.kind === 'container.deleted' && result.container === container
    case 'image.save': {
      const { image } = operation
      return (result) => result.kind === 'image.saved' && result.image === image
    }
    case 'container.bootstrap': {
      const { version } = operation.release
      return (result) =>
        result.kind === 'container.bootstrapped' &&
        result.container === container &&
        result.version === version
    }
  }
}
