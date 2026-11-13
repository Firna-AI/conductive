import type { ListeningPort } from '../../src/shared/generated/ListeningPort'
import type { RunnerPortsUpdated } from '../../src/shared/generated/RunnerPortsUpdated'
import { jsonBytes } from '../../src/shared/event-limits'

const PRIVATE_REPORT_MAX_BYTES = 524_288

/** Preserve complete filter input, or omit the whole optional label. */
export function privatePortReport(
  event: RunnerPortsUpdated,
  warn: (message: string) => void,
): RunnerPortsUpdated {
  const ports: ListeningPort[] = event.ports.map(({ port }) => ({
    port,
    name: null,
    folder: null,
  }))
  let bytes = jsonBytes({ ...event, ports })
  let omitted = false
  for (const [index, source] of event.ports.entries()) {
    for (const field of ['name', 'folder'] as const) {
      const label = source[field]
      if (label === null) continue
      const added = jsonBytes(label) - jsonBytes(null)
      if (bytes + added > PRIVATE_REPORT_MAX_BYTES) {
        omitted = true
        continue
      }
      ports[index][field] = label
      bytes += added
    }
  }
  if (omitted)
    warn('The listening port labels exceeded the private report budget.')
  return { ...event, ports }
}
