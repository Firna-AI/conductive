import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import { RUNNER_PROTOCOL_VERSION } from '../../src/shared/runner'
import type { RunnerFileCommand } from '../../src/shared/runner-files'
import { HttpError } from '../http'
import { RunnerFileReports } from '../files/runner-reports'
import { RunnerDelivery } from './runner-delivery'
import { parseRunnerTransport } from './runner-input'
import type { ChatStore } from './store'
import { storeRunnerReceipt } from './runner-receipt'
import type {
  ChatDependencies,
  ChatCallbackPublisher,
  ActiveRunner,
  RunnerPeer,
  RunnerWorkspaceRecord,
} from './types'

export class RunnerChannel {
  private current: ActiveRunner | null = null
  private readonly delivery: RunnerDelivery
  private readonly store: ChatStore
  private readonly dependencies: ChatDependencies
  private readonly publish: (events: readonly WorkspaceEventEnvelope[]) => void

  constructor(
    store: ChatStore,
    dependencies: ChatDependencies,
    publish: (events: readonly WorkspaceEventEnvelope[]) => void,
  ) {
    this.store = store
    this.dependencies = dependencies
    this.publish = publish
    this.delivery = new RunnerDelivery(store, dependencies, publish)
  }

  open(workspace: RunnerWorkspaceRecord, peer: RunnerPeer): Promise<void> {
    return this.store.run(async () => {
      await this.store.read(workspace.id, async () => undefined)
      this.current?.peer.close()
      this.current = {
        peer,
        workspace,
        streamId: null,
        ready: false,
        delivered: new Set(),
      }
    })
  }

  disconnect(peer: RunnerPeer): void {
    if (this.current?.peer === peer) this.current = null
  }

  close(): void {
    const active = this.current
    this.current = null
    try {
      active?.peer.close()
    } catch {
      /* The transport is already closed. */
    }
  }

  receive(peer: RunnerPeer, value: unknown): Promise<void> {
    return this.store.run(async () => {
      const active = this.current
      if (!active || active.peer !== peer) return
      try {
        await this.handle(active, value)
      } catch (error) {
        this.disconnect(peer)
        peer.close()
        throw error
      }
    })
  }

  private async handle(active: ActiveRunner, value: unknown): Promise<void> {
    const message = parseRunnerTransport(value)
    if (message.type === 'hello') {
      if (active.streamId || message.workspaceId !== active.workspace.id) {
        throw new HttpError(
          400,
          'runner_hello_mismatch',
          'The connection is not available.',
        )
      }
      const welcome = await this.store.change(
        active.workspace.id,
        async (transaction) => {
          await new RunnerFileReports(transaction.files).beginStream(
            message.streamId,
          )
          return {
            cursor: await transaction.cursor(message.streamId),
            ready: await transaction.streamReady(message.streamId),
          }
        },
        this.publish,
      )
      active.streamId = message.streamId
      active.ready = welcome.ready
      active.peer.send({
        type: 'welcome',
        protocolVersion: RUNNER_PROTOCOL_VERSION,
        streamId: message.streamId,
        confirmedThrough: welcome.cursor,
      })
      void this.store
        .run(() => this.flush())
        .catch(() => {
          this.disconnect(active.peer)
          active.peer.close()
        })
      return
    }
    if (!active.streamId)
      throw new HttpError(
        400,
        'runner_hello_required',
        'The connection is not ready.',
      )
    if (
      message.type === 'file.read.result' ||
      message.type === 'file.diff.result'
    ) {
      await this.dependencies.receiveFileResult(message.value)
      return
    }
    if (message.streamId !== active.streamId)
      throw new HttpError(
        400,
        'runner_stream_mismatch',
        'The connection is not available.',
      )
    let stored: WorkspaceEventEnvelope | undefined
    let becameReady = false
    const cursor = await this.store.change(
      active.workspace.id,
      async (transaction) => {
        stored = undefined
        becameReady = false
        const through = await transaction.cursor(message.streamId)
        if (message.eventNumber !== through + 1) return through
        const receipt = await storeRunnerReceipt(
          transaction,
          message,
          this.dependencies.randomId,
        )
        becameReady = receipt.ready
        stored = receipt.stored
        await transaction.saveCursor(message.streamId, message.eventNumber)
        return message.eventNumber
      },
      this.publish,
    )
    if (message.eventNumber > cursor) {
      active.peer.send({
        type: 'resend',
        streamId: message.streamId,
        fromEventNumber: cursor + 1,
      })
      return
    }
    active.peer.send({
      type: 'confirm',
      streamId: message.streamId,
      throughEventNumber: cursor,
    })
    const publish: ChatCallbackPublisher = (event, occurredAt) =>
      this.store.change(
        active.workspace.id,
        (transaction) => transaction.emit(event, occurredAt),
        this.publish,
      )
    if (becameReady) {
      active.ready = true
      await this.dependencies.runnerReady(active.workspace.id, publish)
    }
    if (stored) await this.dependencies.runnerEventStored(stored, publish)
    await this.flush()
  }

  async flush(): Promise<void> {
    const active = this.current
    if (active)
      await this.delivery.flush(
        active,
        () => this.current === active,
        () => this.close(),
      )
  }

  sendFileCommand(workspaceId: string, command: RunnerFileCommand): boolean {
    const active = this.current
    if (!active?.ready || active.workspace.id !== workspaceId) return false
    try {
      active.peer.send(command)
      return true
    } catch {
      this.close()
      return false
    }
  }
}
