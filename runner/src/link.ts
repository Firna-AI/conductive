import { RUNNER_PROTOCOL_VERSION } from '../../src/shared/runner'
import type {
  RunnerCommand,
  RunnerEvent,
  RunnerEventEnvelope,
  WorkspaceToRunner,
} from '../../src/shared/runner'
import type { RunnerFileResponse } from '../../src/shared/runner-files'
import type {
  RunnerConnection,
  RunnerConnectionRequest,
  RunnerConnector,
} from '../../src/shared/runner-transport'
import type { EventStore } from './state'
import type { RetainedReport, RetainedReportKind } from './report-state'

export interface LinkOptions {
  workspaceId: string
  request: RunnerConnectionRequest
  connect: RunnerConnector
  now: () => number
  command: (command: RunnerCommand) => void
  connected: () => Promise<void>
  disconnected: () => void
  warn: (message: string) => void
}

/** Disk writes complete before send. Confirmations never race an append. */
export class RunnerLink {
  readonly store: EventStore
  private readonly options: LinkOptions
  private connection: RunnerConnection | null = null
  private welcomed = false
  private pending: Promise<void> = Promise.resolve()
  private initializing: Promise<void> = Promise.resolve()

  constructor(store: EventStore, options: LinkOptions) {
    this.store = store
    this.options = options
  }

  async connect(): Promise<void> {
    this.connection?.close()
    const connection = await this.options.connect(this.options.request)
    this.connection = connection
    this.welcomed = false
    connection.onMessage((message) =>
      this.enqueue(() => this.receive(message, connection)),
    )
    connection.onClose(() => {
      if (this.connection !== connection) return
      this.connection = null
      this.welcomed = false
      this.options.disconnected()
    })
    connection.send({
      type: 'hello',
      protocolVersion: RUNNER_PROTOCOL_VERSION,
      workspaceId: this.options.workspaceId,
      streamId: this.store.snapshot.streamId,
    })
    await this.idle()
    await this.initializing
    await this.idle()
  }

  async emit(event: RunnerEvent, reportCommandId?: string): Promise<void> {
    const envelope = await this.store.append(
      event,
      this.options.now(),
      reportCommandId,
    )
    this.sendSaved(envelope)
  }

  async persist(): Promise<void> {
    await this.store.persist()
    if (this.welcomed) this.resend(this.store.snapshot.confirmedThrough + 1)
  }

  async refreshReport(
    kind: RetainedReportKind,
    commandId: string,
    prepare: (report: RetainedReport) => RetainedReport,
  ): Promise<void> {
    const envelope = await this.store.refreshReport(
      kind,
      commandId,
      this.options.now(),
      prepare,
    )
    if (envelope !== undefined) this.sendSaved(envelope)
  }

  reply(response: RunnerFileResponse): void {
    if (this.welcomed) this.send(response)
  }

  close(): void {
    this.connection?.close()
  }

  async idle(): Promise<void> {
    let pending
    do {
      pending = this.pending
      await pending
    } while (pending !== this.pending)
  }

  private enqueue(action: () => Promise<void>): void {
    this.pending = this.pending.then(action).catch(() => {
      this.options.warn('The runner connection could not process a message.')
      this.connection?.close()
    })
  }

  private send(message: Parameters<RunnerConnection['send']>[0]): void {
    try {
      this.connection?.send(message)
    } catch {
      this.connection?.close()
    }
  }

  private sendSaved(envelope: RunnerEventEnvelope | null): void {
    if (envelope === null) {
      this.options.warn('The runner event exceeds its byte limit.')
      return
    }
    if (this.welcomed) this.send(envelope)
  }

  private async receive(
    message: WorkspaceToRunner,
    connection: RunnerConnection,
  ): Promise<void> {
    if (connection !== this.connection) return
    const stream = this.store.snapshot.streamId
    if (message.type === 'welcome') {
      if (
        message.streamId !== stream ||
        message.protocolVersion !== RUNNER_PROTOCOL_VERSION ||
        this.welcomed
      ) {
        throw new Error('The welcome does not match the runner stream.')
      }
      await this.store.confirm(message.confirmedThrough)
      this.welcomed = true
      this.resend(message.confirmedThrough + 1)
      this.initializing = this.options.connected().catch(() => {
        this.options.warn('The runner connection could not process a message.')
        if (this.connection === connection) connection.close()
      })
    } else if (message.type === 'confirm') {
      if (this.welcomed && message.streamId === stream)
        await this.store.confirm(message.throughEventNumber)
    } else if (message.type === 'resend') {
      if (this.welcomed && message.streamId === stream)
        this.resend(message.fromEventNumber)
    } else if (this.welcomed) this.options.command(message)
  }

  private resend(from: number): void {
    for (const envelope of this.store.snapshot.outbox) {
      if (envelope.eventNumber >= from) this.send(envelope)
    }
  }
}
