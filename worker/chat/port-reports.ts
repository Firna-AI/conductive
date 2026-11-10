import {
  PORT_FOLDER_MAX_CHARACTERS,
  PORT_NAME_MAX_CHARACTERS,
  PORT_REPORT_MAX_PORTS,
  type RunnerPortsUpdated,
} from '../../src/shared/ports'
import { counter, invalidInput, record, string } from './inputs'

function label(value: unknown, limit: number): string | null {
  if (value === null) return null
  const result = string(value)
  if (Array.from(result).length > limit) return invalidInput()
  return result
}

export function parsePortReport(value: unknown): RunnerPortsUpdated {
  const input = record(value)
  if (!Array.isArray(input.ports) || input.ports.length > PORT_REPORT_MAX_PORTS)
    return invalidInput()
  let previous = 0
  const ports = input.ports.map((value: unknown) => {
    const input = record(value)
    const port = counter(input.port)
    if (port <= previous || port > 65535) return invalidInput()
    previous = port
    return {
      port,
      name: label(input.name, PORT_NAME_MAX_CHARACTERS),
      folder: label(input.folder, PORT_FOLDER_MAX_CHARACTERS),
    }
  })
  return { type: 'ports.updated', ports }
}
