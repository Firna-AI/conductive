import type { ConnectionScheduler } from '../security/connection-access'

export interface InputActivityOptions {
  now(): number
  schedule: ConnectionScheduler
  waitUntil(pending: Promise<void>): void
  recordLocal(workspaceId: string, at: number): Promise<void>
  update(workspaceId: string, at: number): Promise<void>
  warn(message: string): void
}

export class InputActivityOwner {
  private latest:
    { workspaceId: string; at: number; revision: number } | undefined
  private revision = 0
  private nextUpdateAt = -Infinity
  private attempted = 0
  private localAttempted = 0
  private local: Promise<void> | undefined
  private running: Promise<void> | undefined
  private cancelTimer: (() => void) | undefined
  private readonly options: InputActivityOptions

  constructor(options: InputActivityOptions) {
    this.options = options
  }

  record(workspaceId: string, at = this.options.now()): void {
    this.latest = {
      workspaceId,
      at: Math.max(at, this.latest?.at ?? -Infinity),
      revision: ++this.revision,
    }
    this.recordLocal()
    this.advance()
  }

  async localSettled(): Promise<void> {
    while (this.local) await this.local
  }

  async settled(): Promise<void> {
    await this.localSettled()
    while (this.running) await this.running
  }

  private recordLocal(): void {
    if (this.local) return
    this.local = Promise.resolve()
      .then(async () => {
        while (this.latest && this.localAttempted < this.latest.revision) {
          const input = this.latest
          this.localAttempted = input.revision
          try {
            await this.options.recordLocal(input.workspaceId, input.at)
          } catch {
            this.options.warn(
              'Workspace activity timestamp could not be saved.',
            )
          }
        }
      })
      .finally(() => {
        this.local = undefined
        if (this.latest && this.localAttempted < this.latest.revision)
          this.recordLocal()
      })
    this.options.waitUntil(this.local)
  }

  private advance(): void {
    if (this.running || !this.latest || this.attempted === this.latest.revision)
      return
    const delay = this.nextUpdateAt - this.options.now()
    if (delay > 0) {
      if (!this.cancelTimer)
        this.cancelTimer = this.options.schedule(async () => {
          this.cancelTimer = undefined
          this.advance()
        }, delay)
      return
    }
    this.cancelTimer?.()
    this.cancelTimer = undefined
    const input = this.latest
    this.attempted = input.revision
    this.nextUpdateAt = this.options.now() + 60_000
    this.running = Promise.resolve()
      .then(() => this.options.update(input.workspaceId, input.at))
      .catch(() => {
        this.attempted = input.revision - 1
        this.options.warn('Workspace activity update failed.')
      })
      .finally(() => {
        this.running = undefined
        this.advance()
      })
    this.options.waitUntil(this.running)
  }
}
