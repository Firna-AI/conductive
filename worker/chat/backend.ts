import type { UserMessage } from '../../src/shared/generated/UserMessage'
import type { RunnerFileCommand } from '../../src/shared/generated/RunnerFileCommand'
import type { WorkspaceEvent, WorkspaceEventEnvelope } from './workspace-events'
import type {
  ToolSessionAccess,
  ToolSessionWrite,
  ToolSessionManagement,
} from '../tools/services'
import type { FirstWorkspaceMessage } from '../lifecycle/workspace-runtime'
import type { AppEnv } from '../env'
import { WorkspaceTurnTokens } from '../model-gateway/workspace'
import { chatDependencies } from './dependencies'
import {
  authorizeChatBrowser,
  type BrowserAccess,
} from './browser-authorization'
import { fetchWorkspaceChat } from './backend-fetch'
import {
  BrowserConnections,
  type NativeBrowserConnections,
} from './browser-connections'
import { authorizeChatRunner } from './runner-authorization'
import { WorkspaceTitles } from './workspace-titles'
import { WorkspaceOperations } from './workspace-operations'
import { ChatWorkspaceBinding } from './workspace-binding'
import { ChatOperation } from './operation'
import { RunnerChannel } from './runner-channel'
import type { ChatStore, ChatTransaction, QueuedWorkspaceRead } from './store'
import type { QueueTurn } from './queue-turn'
import { createWorkspaceChatStore } from './workspace-store'
import { workspaceOperationRunner } from './workspace-operation'
import { openBrowser } from './sockets'
import { acceptSecretNotice } from './secret-notice'
import type { StoredSecretRequest } from '../secrets/request-records'
import type {
  BrowserPeer,
  ChatDependencies,
  ChatStorage,
  RunnerPeer,
} from './types'

/** The Durable Object and the in-memory runner adapter use this boundary. */
export class WorkspaceChat {
  readonly authorizedWorkspaceOperation: ReturnType<
    typeof workspaceOperationRunner
  >
  private readonly storage: ChatStorage
  readonly store: ChatStore
  readonly turnTokens: WorkspaceTurnTokens
  private readonly env: AppEnv
  private readonly dependencies: ChatDependencies
  readonly runner: RunnerChannel
  readonly browsers: BrowserConnections
  private readonly operations: WorkspaceOperations
  private readonly titles: WorkspaceTitles
  private readonly binding: ChatWorkspaceBinding

  workspaceSummary(...input: Parameters<WorkspaceOperations['summary']>) {
    return this.operations.summary(...input)
  }

  runLifecycle<T>(operation: (turn: QueueTurn) => Promise<T>): Promise<T> {
    return this.store.run(operation)
  }

  flushRunner(): Promise<void> {
    return this.runner.flush()
  }

  secretNotice(record: StoredSecretRequest) {
    return acceptSecretNotice(
      this.operation(record.request.workspaceId),
      record,
      this.env,
      this.dependencies,
    )
  }

  acceptToolWrite(
    input: ToolSessionWrite,
    authorize: () => Promise<ToolSessionAccess>,
  ) {
    return this.operations.writeTool(input, authorize)
  }

  manageToolSession(
    input: ToolSessionManagement,
    origin: string,
    authorize: () => Promise<ToolSessionAccess>,
  ) {
    return this.operations.manageTool(input, origin, authorize)
  }

  async acceptFirstMessage(first: FirstWorkspaceMessage): Promise<UserMessage> {
    return this.operations.accept(first)
  }

  stopWorkspace(...input: Parameters<WorkspaceOperations['stop']>) {
    return this.operations.stop(...input)
  }

  stopTurnsForRestart(workspaceId: string): Promise<void> {
    return this.operations.stopTurnsForRestart(workspaceId)
  }

  commitWorkspaceEvent(
    workspaceId: string,
    event: WorkspaceEvent,
    occurredAt?: number,
  ): Promise<void> {
    return this.operations.commit(workspaceId, event, occurredAt)
  }

  commitPreviewRevocations(workspaceId: string, previewIds: readonly string[]) {
    return this.operations.revokePreviews(workspaceId, previewIds)
  }

  constructor(
    storage: ChatStorage,
    env: AppEnv,
    overrides: Partial<ChatDependencies> = {},
    native?: NativeBrowserConnections,
  ) {
    this.storage = storage
    this.env = env
    this.binding = new ChatWorkspaceBinding(
      overrides.matchesObject ?? (() => true),
    )
    const workspaceId = () => this.binding.id
    this.dependencies = chatDependencies(env, workspaceId, storage, overrides)
    this.store = createWorkspaceChatStore(
      storage,
      env,
      this.dependencies,
      this.publish,
      () => this.runner.connections.current?.state ?? null,
    )
    this.authorizedWorkspaceOperation = workspaceOperationRunner(
      this.store,
      this.publish,
      (id) => this.binding.bind(id),
    )
    this.titles = new WorkspaceTitles(
      env,
      this.store,
      this.dependencies,
      (events) => this.publish(events),
    )
    this.browsers = new BrowserConnections(
      this.store,
      this.dependencies,
      (id) => this.operation(id),
      (id) => this.binding.bind(id),
      native,
    )
    this.turnTokens = new WorkspaceTurnTokens(
      this,
      env,
      (id) => this.operation(id),
      this.dependencies.randomId,
    )
    this.runner = new RunnerChannel(
      this.store,
      this.dependencies,
      (events) => this.publish(events),
      (id, turnId, kind) => this.turnTokens.forRunningTurn(id, turnId, kind),
      (id) => this.binding.bind(id),
      { native, env, storage },
    )
    this.operations = new WorkspaceOperations({
      env,
      store: this.store,
      dependencies: this.dependencies,
      workspaceId: () => this.binding.id,
      bind: (id) => this.binding.bind(id),
      publish: (events) => this.publish(events),
      closeRunner: (id) => this.runner.stop(id),
      closeRunnerAfterRestartFailure: () => this.closeRunner(),
      flushRunner: () => this.runner.flush(),
    })
  }

  fetch(request: Request): Promise<Response> {
    return fetchWorkspaceChat(request, {
      chat: this,
      store: this.store,
      storage: this.storage,
      env: this.env,
      dependencies: this.dependencies,
      operation: (id) => this.operation(id),
    })
  }

  async authorizeBrowser(request: Request): Promise<BrowserAccess> {
    const access = await authorizeChatBrowser(
      request,
      this.env,
      this.dependencies.now(),
    )
    this.binding.bind(access.workspace.id)
    return access
  }

  async connectRunner(
    request: Request,
    peer: RunnerPeer,
    socket?: WebSocket,
  ): Promise<void> {
    const workspace = await authorizeChatRunner(this.env, request)
    this.binding.bind(workspace.id)
    await this.runner.open(workspace, peer, socket)
  }

  receiveRunner(peer: RunnerPeer, value: unknown): Promise<void> {
    return this.runner.receive(peer, value)
  }
  disconnectRunner(peer: RunnerPeer): void {
    this.runner.disconnect(peer)
  }

  closeRunner(): void {
    this.runner.close()
  }

  closeConnections(): void {
    this.runner.close()
    this.browsers.closeAll()
  }

  /** Trusted feature owners share the same stored browser event sequence. */
  async appendWorkspaceEvent(
    workspaceId: string,
    event: WorkspaceEvent,
    occurredAt = this.dependencies.now(),
  ): Promise<void> {
    await this.changeWorkspace(workspaceId, (transaction) =>
      transaction.emit(event, occurredAt),
    )
  }

  readWorkspace<T>(
    workspaceId: string,
    work: QueuedWorkspaceRead<T>,
  ): Promise<T> {
    this.binding.bind(workspaceId)
    return this.store.readQueued(workspaceId, work)
  }

  /** Keep feature records, events, and publication in one serial task. */
  changeWorkspace<T>(
    workspaceId: string,
    work: (transaction: ChatTransaction) => Promise<T>,
  ): Promise<T> {
    this.binding.bind(workspaceId)
    return this.store.run(() =>
      this.store.change(workspaceId, work, (events) => this.publish(events)),
    )
  }

  async sendFileCommand(
    workspaceId: string,
    command: RunnerFileCommand,
  ): Promise<boolean> {
    this.binding.bind(workspaceId)
    return this.store.run(async () =>
      this.runner.sendFileCommand(workspaceId, command),
    )
  }

  async openBrowser(request: Request, peer: BrowserPeer): Promise<() => void> {
    return openBrowser(this, request, peer)
  }

  subscribe(
    access: BrowserAccess,
    after: number,
    peer: BrowserPeer,
    socket?: WebSocket,
    registered?: () => void,
  ): Promise<() => void> {
    return this.browsers.subscribe(access, after, peer, socket, registered)
  }

  operation(workspaceId: string): ChatOperation {
    this.binding.bind(workspaceId)
    return new ChatOperation(
      this.store,
      workspaceId,
      this.dependencies,
      this.publish,
    )
  }

  private publish = (events: readonly WorkspaceEventEnvelope[]): void => {
    this.browsers.publish(events)
    this.titles.accepted(events)
  }
}
