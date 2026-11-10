import type { ListeningPort, RunnerPortsUpdated } from '../../src/shared/ports'
import { PortReporter, type PortReporterOptions } from '../src/ports'

export function portDriver() {
  let ports: readonly ListeningPort[] = []
  let pending: (() => Promise<readonly ListeningPort[]>) | null = null
  let scheduled: (() => Promise<void>) | null = null
  const intervals: number[] = []
  let stopped = 0
  const options: PortReporterOptions = {
    scan: async () => (pending ? pending() : ports),
    schedule: (scan, interval) => {
      scheduled = scan
      intervals.push(interval)
      return () => {
        scheduled = null
        stopped++
      }
    },
  }
  return {
    options,
    intervals,
    get stopped() {
      return stopped
    },
    set: (value: readonly ListeningPort[]) => {
      ports = value
    },
    hold: (value: (() => Promise<readonly ListeningPort[]>) | null) => {
      pending = value
    },
    tick: async () => {
      await scheduled?.()
    },
  }
}

export function reporterFixture() {
  const driver = portDriver()
  const reports: { event: RunnerPortsUpdated; commandId?: string }[] = []
  const warnings: string[] = []
  const reporter = new PortReporter(
    driver.options,
    async (event, commandId) => {
      reports.push({ event, ...(commandId ? { commandId } : {}) })
    },
    (message) => {
      warnings.push(message)
    },
  )
  return {
    ...driver,
    get stopped() {
      return driver.stopped
    },
    reports,
    warnings,
    reporter,
  }
}
