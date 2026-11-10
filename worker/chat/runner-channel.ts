import { warnWorker } from '../warnings'
import { errorSummary, WarningId } from '../warning-values'
import type { WorkspaceEventEnvelope } from './workspace-events'
import type { RunnerFileCommand } from '../../src/shared/runner-files'
import { HttpError } from '../http'
import { AuthenticatedRunner } from './authenticated-runner'
import { RunnerDelivery } from './runner-delivery'
import { parseRunnerTransport } from './runner-input'
import type { ChatStore } from './store'
import type { WorkspaceTurnTokens } from '../model-gateway/workspace'
import { storeRunnerReceipt } from './runner-receipt'
import { RepairDelivery } from './repair-delivery'
import { prepareRunnerHello } from './runner-handshake'
import type {
  ChatDependencies,
  ChatCallbackPublisher,
  ActiveRunner,
  RunnerPeer,
  RunnerWorkspaceRecord,
} from './types'

export class RunnerChannel {
  private connectionId: string | null = null
  private current: ActiveRunner | null = null
  private readonly delivery: RunnerDelivery
  private readonly repairs: RepairDelivery
  private readonly store: ChatStore
  private readonly dependencies: ChatDependencies
  private readonly publish: (events: readonly WorkspaceEventEnvelope[]) => void

  constructor(
    store: ChatStore,
    dependencies: ChatDependencies,
    publish: (events: readonly WorkspaceEventEnvelope[]) => void,
    forRunningTurn: WorkspaceTurnTokens['forRunningTurn'],
  ) {
    this.store = store
    this.dependencies = dependencies
    this.publish = publish
    this.delivery = new RunnerDelivery(
      store,
      dependencies,
      publish,
      () => this.flush(),
      forRunningTurn,
    )
    this.repairs = new RepairDelivery(store, publish)
  }

  open(workspace: RunnerWorkspaceRecord, peer: RunnerPeer): Promise<void> {
    return this.store.run(async () => {
      await this.store.read(workspace.id, async () => undefined)
      this.close()
      const active: ActiveRunner = {
        peer: new AuthenticatedRunner(
          peer,
          workspace,
          this.dependencies,
          () => {
            if (this.current !== active) return
            this.current = null
            if (this.connectionId)
              this.dependencies.runnerDetached(this.connectionId)
            this.connectionId = null
            this.dependencies.waitUntil(
              this.store.run(() =>
                this.dependencies.runnerDisconnected(
                  active.workspace.id,
                  this.publisher(active.workspace.id),
                ),
              ),
            )
          },
        ),
        workspace,
        streamId: null,
        protocolVersion: null,
        ready: false,
        delivered: new Set(),
      }
      this.current = active
      const connectionId = this.dependencies.randomConnectionId()
      this.connectionId = connectionId
    })
  }

  disconnect(peer: RunnerPeer): void {
    if (this.current?.peer.matches(peer)) this.close()
  }

  close(): void {
    const active = this.current
    try {
      active?.peer.close()
    } catch {
      /* The transport is already closed. */
    }
  }

  receive(peer: RunnerPeer, value: unknown): Promise<void> {
    return this.store.run(async () => {
      const active = this.current
      if (!active || !active.peer.matches(peer)) return
      if (!(await active.peer.authorize())) return
      try {
        await this.handle(active, value)
      } catch (error) {
        warnWorker({
          kind: 'runner_message_failed',
          workspaceId: WarningId.checked(active.workspace.id),
          error: errorSummary(error),
        })
        active.peer.close()
        throw error
      }
    })
  }

  private async handle(active: ActiveRunner, value: unknown): Promise<void> {
    const message = parseRunnerTransport(value)
    if (message.type === 'hello') {
      const welcome = await prepareRunnerHello(
        active,
        message,
        this.store,
        this.dependencies,
        this.publish,
      )
      if (!welcome) return
      active.streamId = message.streamId
      active.protocolVersion = message.protocolVersion
      active.ready = welcome.ready
      if (active.ready) this.attachFiles(active)
      await active.peer.send({
        type: 'welcome',
        protocolVersion: message.protocolVersion,
        streamId: message.streamId,
        confirmedThrough: welcome.cursor,
      })
      await this.repairs.flush(active)
      await this.dependencies.runnerHello(
        active.workspace.id,
        this.publisher(active.workspace.id),
      )
      if (active.ready)
        await this.dependencies.runnerReady(
          active.workspace.id,
          this.publisher(active.workspace.id),
        )
      void this.store
        .run(() => this.flush())
        .catch(() => {
          if (this.current === active) this.close()
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
      if (this.connectionId)
        await this.dependencies.receiveFileResult(
          message.value,
          this.connectionId,
        )
      return
    }
    if (message.streamId !== active.streamId)
      throw new HttpError(
        400,
        'runner_stream_mismatch',
        'The connection is not available.',
      )
    let stored: WorkspaceEventEnvelope[] = []
    let becameReady = false
    const cursor = await this.store.change(
      active.workspace.id,
      async (transaction) => {
        stored = []
        becameReady = false
        const through = await transaction.cursor(message.streamId)
        if (message.eventNumber !== through + 1) return through
        const receipt = await storeRunnerReceipt(
          transaction,
          active.workspace,
          message,
          this.dependencies,
        )
        becameReady = receipt.ready
        stored = receipt.stored
        await transaction.saveCursor(message.streamId, message.eventNumber)
        return message.eventNumber
      },
      this.publish,
    )
    if (message.eventNumber > cursor) {
      await active.peer.send({
        type: 'resend',
        streamId: message.streamId,
        fromEventNumber: cursor + 1,
      })
      return
    }
    await this.repairs.flush(active)
    await active.peer.send({
      type: 'confirm',
      streamId: message.streamId,
      throughEventNumber: cursor,
    })
    await this.store.reportTurnEnds()
    const publish = this.publisher(active.workspace.id)
    if (becameReady) {
      active.ready = true
      this.attachFiles(active)
      await this.dependencies.runnerReady(active.workspace.id, publish)
    }
    for (const envelope of stored)
      await this.dependencies.runnerEventStored(envelope, publish)
    await this.flush()
  }

  async flush(): Promise<void> {
    const active = this.current
    if (active) {
      if (!(await active.peer.authorize())) return
      try {
        await this.repairs.flush(active)
      } catch (error) {
        this.close()
        throw error
      }
      await this.delivery.flush(
        active,
        () => this.current === active,
        () => this.close(),
      )
    }
  }

  private publisher(workspaceId: string): ChatCallbackPublisher {
    return async (event, occurredAt) => {
      await this.store.change(
        workspaceId,
        (transaction) => transaction.emit(event, occurredAt),
        this.publish,
      )
    }
  }

  private attachFiles(active: ActiveRunner): void {
    const id = this.connectionId
    if (!id) return
    this.dependencies.runnerAttached(active.workspace.id, id, (command) =>
      this.store.run(() =>
        this.current === active && this.connectionId === id
          ? this.sendFileCommand(active.workspace.id, command)
          : Promise.resolve(false),
      ),
    )
  }

  async sendFileCommand(
    workspaceId: string,
    command: RunnerFileCommand,
  ): Promise<boolean> {
    const active = this.current
    if (!active?.ready || active.workspace.id !== workspaceId) return false
    try {
      await active.peer.send(command)
      return true
    } catch {
      this.close()
      return false
    }
  }
}
