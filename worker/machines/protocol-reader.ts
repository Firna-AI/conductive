import type { HostResult } from '../../src/shared/generated/HostResult'
import type { HostToWorker } from '../../src/shared/generated/HostToWorker'
import { isRecord } from '../http'

export function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
function id(value: unknown): value is number {
  return count(value) && value <= 0xffff_ffff
}
function exitCode(value: unknown): boolean {
  return (
    value === null || (typeof value === 'number' && Number.isSafeInteger(value))
  )
}

function result(value: unknown): value is HostResult {
  if (!isRecord(value)) return false
  switch (value.kind) {
    case 'command.result':
      return (
        exitCode(value.exitCode) &&
        typeof value.stdout === 'string' &&
        typeof value.stderr === 'string' &&
        typeof value.timedOut === 'boolean'
      )
    case 'command.started':
      return count(value.processId) && value.processId > 0
    case 'command.status':
      return (
        count(value.processId) &&
        value.processId > 0 &&
        typeof value.state === 'string' &&
        ['running', 'exited', 'lost'].includes(value.state) &&
        typeof value.running === 'boolean' &&
        exitCode(value.exitCode) &&
        (value.timedOut === null || typeof value.timedOut === 'boolean') &&
        typeof value.stdout === 'string' &&
        typeof value.stderr === 'string' &&
        count(value.stdoutNextOffset) &&
        count(value.stderrNextOffset) &&
        typeof value.more === 'boolean'
      )
    case 'file.info':
      return (
        typeof value.path === 'string' &&
        count(value.sizeBytes) &&
        typeof value.isDirectory === 'boolean'
      )
    case 'file.content':
      return (
        typeof value.path === 'string' &&
        count(value.sizeBytes) &&
        value.encoding === 'base64' &&
        typeof value.content === 'string'
      )
    case 'file.too_large':
      return count(value.sizeBytes) && count(value.limitBytes)
    case 'stream.opened':
      return id(value.streamId)
    case 'error':
      return (
        typeof value.code === 'string' &&
        [
          'invalid_request',
          'not_found',
          'permission_denied',
          'is_directory',
          'output_too_large',
          'port_unavailable',
          'busy',
          'internal',
        ].includes(value.code)
      )
    default:
      return false
  }
}

export function readHostMessage(value: unknown): HostToWorker | null {
  if (!isRecord(value)) return null
  switch (value.type) {
    case 'hello':
      return typeof value.hostProtocolVersion === 'number' &&
        Number.isFinite(value.hostProtocolVersion) &&
        typeof value.programVersion === 'string'
        ? {
            type: 'hello',
            hostProtocolVersion: value.hostProtocolVersion,
            programVersion: value.programVersion,
          }
        : null
    case 'ping':
      return { type: 'ping' }
    case 'reply':
      return id(value.requestId) && result(value.result)
        ? { type: 'reply', requestId: value.requestId, result: value.result }
        : null
    case 'stream.end':
    case 'stream.close':
      return id(value.streamId)
        ? { type: value.type, streamId: value.streamId }
        : null
    case 'stream.credit':
      return id(value.streamId) && count(value.bytes) && value.bytes > 0
        ? {
            type: 'stream.credit',
            streamId: value.streamId,
            bytes: value.bytes,
          }
        : null
    default:
      return null
  }
}
