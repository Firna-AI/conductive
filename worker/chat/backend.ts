import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../../src/shared/events'
import type { UserMessage } from '../../src/shared/messages'
import type { FirstWorkspaceMessage } from '../lifecycle/workspace-runtime'
import type { RunnerFileCommand } from '../../src/shared/runner-files'
import type { AppEnv } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import { chatDependencies } from './dependencies'
import {
  authorizeChatBrowser,
  type BrowserAccess,
} from './browser-authorization'
import { subscribeBrowser } from './browser-subscription'
import { afterNumber, chatRoute } from './http-routes'
import { BrowserTabs } from './browser-tabs'
import { tokenWorkspace } from './queries'
import { WorkspaceOperations } from './workspace-operations'
import type { ChatWorkspaceSummary } from './workspace-summary'
import { ChatOperation } from './operation'
import { RunnerChannel } from './runner-channel'
import { ChatStore, type ChatTransaction } from './store'
import {
  runWorkspaceOperation,
  type WorkspaceOperation,
} from './workspace-operation'
import { browserUpgrade, runnerUpgrade } from './sockets'
import type {
  BrowserPeer,
  ChatDependencies,
  ChatStorage,
  RunnerPeer,
} from './types'

/** The Durable Object and the in-memory runner adapter use this boundary. */
export class WorkspaceChat {
  readonly store: ChatStore
  private readonly env: AppEnv
  private readonly dependencies: ChatDependencies
  private readonly runner: RunnerChannel
  private readonly browsers: BrowserTabs
  private readonly operations: WorkspaceOperations
  private workspaceId: string | null = null

  async workspaceSummary(workspaceId?: string): Promise<ChatWorkspaceSummary> {
    return this.operations.summary(workspaceId)
  }

  runLifecycle<T>(operation: () => Promise<T>): Promise<T> {
    return this.store.run(operation)
  }

  flushRunner(): Promise<void> {
    return this.runner.flush()
  }

  async acceptFirstMessage(first: FirstWorkspaceMessage): Promise<UserMessage> {
    return this.operations.accept(first)
  }

  async stopWorkspace(workspaceId: string): Promise<void> {
    await this.operations.stop(workspaceId)
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
  ) {
    this.env = env
    this.dependencies = chatDependencies(env, () => this.workspaceId, overrides)
    this.store = new ChatStore(storage, this.dependencies.now)
    this.browsers = new BrowserTabs(this.dependencies)
    this.runner = new RunnerChannel(this.store, this.dependencies, (events) =>
      this.publish(events),
    )
    this.operations = new WorkspaceOperations({
      env,
      store: this.store,
      dependencies: this.dependencies,
      workspaceId: () => this.workspaceId,
      bind: (id) => this.bind(id),
      publish: (events) => this.publish(events),
      closeRunner: () => this.runner.close(),
    })
  }

  async fetch(request: Request): Promise<Response> {
    try {
      if (new URL(request.url).pathname === MACHINE_PATHS.runner)
        return await runnerUpgrade(this, request)
      const access = await this.authorizeBrowser(request)
      if (access.suffix === '/events')
        return await browserUpgrade(this, request, access)
      return await this.store.run(async () => {
        const write = request.method !== 'GET' && request.method !== 'HEAD'
        if (write && access.workspace.archivedAt !== null) {
          throw new HttpError(
            409,
            'workspace_archived',
            'The archived chat is read-only.',
          )
        }
        const response = await chatRoute(
          request,
          access.suffix,
          access.context,
          this.operation(access.workspace.id),
          this.dependencies,
        )
        if (write) await this.runner.flush()
        return privateResponse(response)
      })
    } catch (error) {
      return privateResponse(errorResponse(error))
    }
  }

  async authorizeBrowser(request: Request): Promise<BrowserAccess> {
    const access = await authorizeChatBrowser(
      request,
      this.env,
      this.dependencies.now(),
    )
    this.bind(access.workspace.id)
    return access
  }

  async connectRunner(request: Request, peer: RunnerPeer): Promise<void> {
    const url = new URL(request.url)
    if (
      !this.env.MACHINE_ORIGIN ||
      url.origin !== this.env.MACHINE_ORIGIN ||
      url.pathname !== MACHINE_PATHS.runner
    ) {
      throw new HttpError(
        403,
        'machine_forbidden',
        'The connection is not available.',
      )
    }
    const bearer = request.headers
      .get('Authorization')
      ?.match(/^Bearer (.+)$/i)?.[1]
    const workspace = bearer ? await tokenWorkspace(this.env.DB, bearer) : null
    if (!workspace)
      throw new HttpError(
        401,
        'workspace_token_required',
        'The connection is not available.',
      )
    this.bind(workspace.id)
    await this.runner.open(workspace, peer)
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
    work: (view: ChatTransaction) => Promise<T>,
  ): Promise<T> {
    this.bind(workspaceId)
    return this.store.run(() => this.store.read(workspaceId, work))
  }

  /** Keep feature records, events, and publication in one serial task. */
  changeWorkspace<T>(
    workspaceId: string,
    work: (transaction: ChatTransaction) => Promise<T>,
  ): Promise<T> {
    this.bind(workspaceId)
    return this.store.run(() =>
      this.store.change(workspaceId, work, (events) => this.publish(events)),
    )
  }

  authorizedWorkspaceOperation<T>(
    workspaceId: string,
    authorize: () => Promise<void>,
    work: (operation: WorkspaceOperation) => Promise<T>,
  ): Promise<T> {
    this.bind(workspaceId)
    return runWorkspaceOperation(
      this.store,
      workspaceId,
      authorize,
      this.publish,
      work,
    )
  }

  async sendFileCommand(
    workspaceId: string,
    command: RunnerFileCommand,
  ): Promise<boolean> {
    this.bind(workspaceId)
    return this.store.run(async () =>
      this.runner.sendFileCommand(workspaceId, command),
    )
  }

  async openBrowser(request: Request, peer: BrowserPeer): Promise<() => void> {
    const access = await this.authorizeBrowser(request)
    if (access.suffix !== '/events')
      throw new HttpError(404, 'not_found', 'The page is not available.')
    return this.subscribe(access, afterNumber(new URL(request.url)), peer)
  }

  subscribe(
    access: BrowserAccess,
    after: number,
    peer: BrowserPeer,
  ): Promise<() => void> {
    return subscribeBrowser({
      store: this.store,
      browsers: this.browsers,
      operation: this.operation(access.workspace.id),
      access,
      after,
      peer,
    })
  }

  private operation(workspaceId: string): ChatOperation {
    return new ChatOperation(
      this.store,
      workspaceId,
      this.dependencies,
      this.publish,
    )
  }

  private bind(workspaceId: string): void {
    if (
      !this.dependencies.matchesObject(workspaceId) ||
      (this.workspaceId && this.workspaceId !== workspaceId)
    ) {
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    }
    this.workspaceId = workspaceId
  }

  private publish = (events: readonly WorkspaceEventEnvelope[]): void => {
    this.browsers.publish(events)
  }
}
