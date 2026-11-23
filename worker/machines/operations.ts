import type { HostOperation } from '../../src/shared/generated/HostOperation'
import {
  HOST_FILE_READ_MAX_BYTES,
  HOST_STREAM_PORTS,
} from '../../src/shared/host'
import { invalidRequest } from './errors'
import { count } from './protocol-reader'

export function validateOperation(operation: HostOperation): void {
  switch (operation.kind) {
    case 'command.run':
      if (
        !count(operation.timeoutSeconds) ||
        operation.timeoutSeconds < 1 ||
        operation.timeoutSeconds > 600
      )
        throw invalidRequest()
      break
    case 'command.status':
      if (
        !count(operation.processId) ||
        operation.processId === 0 ||
        !count(operation.stdoutOffset) ||
        !count(operation.stderrOffset)
      )
        throw invalidRequest()
      break
    case 'file.read':
      if (
        !count(operation.maxBytes) ||
        operation.maxBytes > HOST_FILE_READ_MAX_BYTES
      )
        throw invalidRequest()
      break
    case 'stream.open':
      if (!HOST_STREAM_PORTS.includes(operation.port)) throw invalidRequest()
      break
    case 'command.start':
      break
  }
  if (
    'path' in operation &&
    (!operation.path.startsWith('/') || operation.path.includes('\0'))
  )
    throw invalidRequest()
}
