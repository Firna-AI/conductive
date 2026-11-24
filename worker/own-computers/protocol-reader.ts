import { COMPUTER_PROTOCOL_VERSION } from '../../src/shared/computer'
import type { ComputerToWorker } from '../../src/shared/generated/ComputerToWorker'
import type { ComputerResult } from '../../src/shared/generated/ComputerResult'
import { isRecord } from '../http'
import { count } from '../machines/protocol-reader'
import { isComputerErrorCode } from './errors'
import { containerName, plainVersion, unsigned32 } from './operations'

type ComputerHello = Extract<ComputerToWorker, { type: 'hello' }>

export function readComputerHello(
  value: unknown,
): ComputerHello | 'unsupported' | null {
  if (
    !isRecord(value) ||
    value.type !== 'hello' ||
    !unsigned32(value.computerProtocolVersion)
  )
    return null
  if (value.computerProtocolVersion !== COMPUTER_PROTOCOL_VERSION)
    return 'unsupported'
  const { programVersion, resources } = value
  if (!plainVersion(programVersion) || !isRecord(resources)) return null
  const { cpus, memoryBytes, system } = resources
  if (
    !unsigned32(cpus) ||
    cpus < 1 ||
    !count(memoryBytes) ||
    memoryBytes < 1 ||
    typeof system !== 'string' ||
    system.length > 256 ||
    !system.trim() ||
    /\p{Cc}/u.test(system)
  )
    return null
  return {
    type: 'hello',
    computerProtocolVersion: COMPUTER_PROTOCOL_VERSION,
    programVersion,
    resources: { cpus, memoryBytes, system },
  }
}

export function readComputerReply(value: unknown) {
  if (
    !isRecord(value) ||
    value.type !== 'reply' ||
    !unsigned32(value.requestId) ||
    value.requestId === 0
  )
    return null
  const result = readResult(value.result)
  return result && { requestId: value.requestId, result }
}

function readResult(value: unknown): ComputerResult | null {
  if (!isRecord(value)) return null
  const { kind, container } = value
  switch (kind) {
    case 'container': {
      const { state } = value
      return containerName(container) &&
        (state === 'running' || state === 'stopped' || state === 'missing')
        ? { kind, container, state }
        : null
    }
    case 'container.deleted':
      return containerName(container) ? { kind, container } : null
    case 'image.saved':
      return containerName(value.image) ? { kind, image: value.image } : null
    case 'container.bootstrapped':
      return containerName(container) && plainVersion(value.version)
        ? { kind, container, version: value.version }
        : null
    case 'error':
      return isComputerErrorCode(value.code) ? { kind, code: value.code } : null
    default:
      return null
  }
}
