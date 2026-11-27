import type { RunnerFileCommand } from '../../src/shared/generated/RunnerFileCommand'
import type { PublishWorkspaceEvents } from './workspace-events'
import { HttpError } from '../http'
import { RunnerConnections } from './runner-connections'
import type { NativeBrowserConnections } from './browser-connections'
import type { BrowserTabs } from './browser-tabs'
import { RunnerDelivery } from './runner-delivery'
import { parseRunnerTransport } from './runner-input'
import { receiveRunnerMessage } from './runner-receive'
import { RunnerWorkWatch, type RunnerProgress } from './runner-work-watch'
import type { ChatStore } from './store'
import type { WorkspaceTurnTokens } from '../model-gateway/workspace'
import { commitRunnerReceipt } from './runner-receipt'
import { RepairDelivery } from './repair-delivery'
import { acceptRunnerHello } from './runner-hello'
import { WorkspaceServices } from '../services/runtime'
import type { AppEnv } from '../env'
import { RepositoryMoves } from './runner-repository-move'
import type {
  ChatDependencies,
  ChatStorage,
  ChatCallbackPublisher,
  ActiveRunner,
  RunnerPeer,
  RunnerWorkspaceRecord,
} from './types'

export class RunnerChannel {
  readonly connections: RunnerConnections
  readonly services: WorkspaceServices
  private readonly delivery: RunnerDelivery
  private readonly repairs: RepairDelivery
  private readonly moves: RepositoryMoves
  private readonly watch: RunnerWorkWatch
  private readonly store: ChatStore
  private readonly dependencies: ChatDependencies
  private readonly acceptsChangesDeltas: () => boolean
  private readonly publish: PublishWorkspaceEvents
  private readonly browsers: Pick<BrowserTabs, 'needsCompleteChanges'>

  constructor(
    store: ChatStore,
    dependencies: ChatDependencies,
    publish: PublishWorkspaceEvents,
    forRunningTurn: WorkspaceTurnTokens['forRunningTurn'],
    bind: (id: string) => void,
    options: {
      native?: NativeBrowserConnections
      browsers: Pick<BrowserTabs, 'needsCompleteChanges'>
      env: AppEnv
      storage: ChatStorage
    },
  ) {
    const { native, browsers, env, storage } = options
    this.store = store
    this.dependencies = dependencies
    this.acceptsChangesDeltas = () => env.CHANGES_DELTAS === 'on'
    this.publish = publish
    this.browsers = browsers
    this.services = new WorkspaceServices(
      storage,
      env,
      store,
      () => this.connections.current,
      dependencies.randomId,
    )
    this.connections = new RunnerConnections(
      store,
      {
        ...dependencies,
        runnerDetached: (id) => {
          dependencies.runnerDetached(id)
          dependencies.waitUntil(
            store.run(() => this.services.disconnected(id)),
          )
        },
      },
      publish,
      bind,
      (peer, value) => this.receive(peer, value),
      native,
    )
    this.moves = new RepositoryMoves(dependencies, (active) =>
      this.connections.persist(active),
    )
    this.delivery = new RunnerDelivery(
      store,
      dependencies,
      publish,
      () => this.flush(),
      forRunningTurn,
      this.moves,
    )
    this.repairs = new RepairDelivery(store, publish)
    this.watch = new RunnerWorkWatch(dependencies.runnerWork, dependencies.now)
  }

  open(
    workspace: RunnerWorkspaceRecord,
    peer: RunnerPeer,
    socket?: WebSocket,
  ): Promise<void> {
    return this.connections.open(workspace, peer, socket)
  }

  async stop(workspaceId: string): Promise<void> {
    await this.services.stopped(workspaceId)
    this.close()
  }

  disconnect(peer: RunnerPeer): void {
    this.connections.disconnect(peer)
  }
  close(): void {
    this.connections.close()
  }

  receive(peer: RunnerPeer, value: unknown): Promise<void> {
    return this.store.run(async () => {
      const active = this.connections.current
      if (!active || !active.peer.matches(peer)) return
      if (!(await active.peer.authorize())) return
      await receiveRunnerMessage(active, value, this.watch, (input, progress) =>
        this.handle(active, input, progress),
      )
    })
  }

  private async handle(
    active: ActiveRunner,
    value: unknown,
    progress: RunnerProgress,
  ): Promise<void> {
    if (await this.services.receive(active, value)) return
    const message = parseRunnerTransport(value)
    progress.stage = message.type === 'hello' ? 'hello' : 'event'
    progress.mark = await this.watch.begin(active, message, progress.size)
    if (message.type === 'hello') {
      if (
        !(await acceptRunnerHello(active, message, {
          store: this.store,
          dependencies: this.dependencies,
          publish: this.publish,
          connections: this.connections,
          repairs: this.repairs,
          moves: this.moves,
          services: this.services,
          changesDeltas: this.acceptsChangesDeltas(),
          publisher: (id) => this.publisher(id),
        }))
      )
        return
      void this.store
        .run(() => this.watch.flush(active, () => this.flush()))
        .catch(() => {
          if (this.connections.current === active) this.close()
          active.peer.close()
        })
      return
    }
    if (!active.state.streamId)
      throw new HttpError(
        400,
        'runner_hello_required',
        'The connection is not ready.',
      )
    if (message.type === 'skill.read.result') {
      progress.stage = 'skill_result'
      this.connections.skillReads.receive(active.state.id, message.value)
      return
    }
    if (
      message.type === 'file.read.result' ||
      message.type === 'file.diff.result'
    ) {
      progress.stage = 'file_result'
      if (active.state.id)
        await this.dependencies.receiveFileResult(
          message.value,
          active.state.id,
        )
      return
    }
    if (message.type === 'repository.move.refused') {
      await this.moves.refused(active, message)
      await this.flush()
      return
    }
    if (message.streamId !== active.state.streamId)
      throw new HttpError(
        400,
        'runner_stream_mismatch',
        'The connection is not available.',
      )
    const { cursor, ready, stored } = await commitRunnerReceipt(
      this.store,
      active.state.workspace,
      message,
      this.dependencies,
      {
        publish: this.publish,
        needsCompleteChanges: () => this.browsers.needsCompleteChanges(),
      },
    )
    progress.stage = 'after_commit'
    await progress.mark?.stage('after_commit')
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
    const publish = this.publisher(active.state.workspace.id)
    if (ready) {
      active.state.ready = true
      await this.connections.persist(active)
      this.connections.attachFiles(active)
      await this.dependencies.runnerReady(active.state.workspace.id, publish)
    }
    for (const envelope of stored)
      await this.dependencies.runnerEventStored(envelope, publish)
    await this.flush()
  }

  /**
   * Moves a connected runner to the record folder, as after a repository
   * change. A runner that cannot move, or that is already there, gets no
   * command. A failed send closes the connection, and the next hello
   * moves the runner. Call inside the store queue.
   */
  async checkRepository(): Promise<void> {
    const active = this.connections.current
    if (!active || active.state.protocolVersion === null) return
    if (!(await active.peer.authorize())) return
    try {
      await this.moves.check(active)
    } catch {
      this.close()
    }
  }

  async flush(): Promise<void> {
    const active = this.connections.current
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
        () => this.connections.current === active,
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

  async sendFileCommand(
    workspaceId: string,
    command: RunnerFileCommand,
  ): Promise<boolean> {
    const active = this.connections.current
    if (!active?.state.ready || active.state.workspace.id !== workspaceId)
      return false
    try {
      await active.peer.send(command)
      return true
    } catch {
      this.close()
      return false
    }
  }
}
