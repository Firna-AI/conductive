import type { ListeningPort, RunnerPortsUpdated } from '../../src/shared/ports'
import { PORT_REPORT_MAX_PORTS } from '../../src/shared/ports'
import { SerialQueue } from './serial-queue'

export interface PortReporterOptions {
  scan: () => Promise<readonly ListeningPort[]>
  schedule: (scan: () => Promise<void>, milliseconds: number) => () => void
}

export class PortReporter {
  private readonly scans = new SerialQueue()
  private previous = new Map<number, ListeningPort>()
  private stable = new Map<number, ListeningPort>()
  private lastReport: readonly ListeningPort[] = []
  private stopWatching: (() => void) | null = null
  private stopped = false
  private readonly options: PortReporterOptions
  private readonly emit: (
    event: RunnerPortsUpdated,
    commandId?: string,
  ) => Promise<void>
  private readonly warn: (message: string) => void
  constructor(
    options: PortReporterOptions,
    emit: (event: RunnerPortsUpdated, commandId?: string) => Promise<void>,
    warn: (message: string) => void,
  ) {
    this.options = options
    this.emit = emit
    this.warn = warn
  }

  refresh(full = false, commandId?: string): Promise<void> {
    return this.scans.run(async () => {
      if (this.stopped) return
      try {
        const scanned = await this.options.scan()
        if (this.stopped) return
        const current = new Map(scanned.map((port) => [port.port, port]))
        for (const [number, port] of current) {
          if (this.previous.has(number)) this.stable.set(number, port)
        }
        for (const number of this.stable.keys())
          if (!current.has(number) && !this.previous.has(number))
            this.stable.delete(number)
        this.previous = current
      } catch {
        if (this.stopped) return
        this.warn('The listening ports could not be read.')
      }
      const ports = [...this.stable.values()]
        .sort((left, right) => left.port - right.port)
        .slice(0, PORT_REPORT_MAX_PORTS)
      if (full || JSON.stringify(ports) !== JSON.stringify(this.lastReport)) {
        await this.emit({ type: 'ports.updated', ports }, commandId)
        this.lastReport = ports
      }
    })
  }

  watch(): void {
    if (this.stopped || this.stopWatching) return
    this.stopWatching = this.options.schedule(
      () =>
        this.refresh().catch(() => {
          this.warn('The listening ports could not update.')
        }),
      2000,
    )
  }

  async close(): Promise<void> {
    this.stopped = true
    this.stopWatching?.()
    this.stopWatching = null
    await this.scans.run(async () => {})
  }
}
