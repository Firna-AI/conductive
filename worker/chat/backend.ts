import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../../src/shared/events'
import { workspacePath } from '../../src/shared/workspaces'
import type { RunnerFileCommand } from '../../src/shared/runner-files'
import type { AppEnv } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import { randomToken } from '../security/crypto'
import { gate, type RequestContext } from '../security/gate'
import { afterNumber, chatRoute } from './http-routes'
import {
  findChatWorkspace,
  readAgentLogin,
  senderIsMember,
  tokenWorkspace,
} from './queries'
import { RunnerChannel } from './runner-channel'
import { ChatStore } from './store'
import { browserUpgrade, runnerUpgrade } from './sockets'
import type {
  BrowserPeer,
  ChatDependencies,
  ChatStorage,
  RunnerPeer,
  WorkspaceRecord,
} from './types'

interface BrowserAccess {
  context: RequestContext
  workspace: WorkspaceRecord
  suffix: string
}

/** The Durable Object and the in-memory runner adapter use this boundary. */
export class WorkspaceChat {
  readonly store: ChatStore
  private readonly env: AppEnv
  private readonly dependencies: ChatDependencies
  private readonly runner: RunnerChannel
  private readonly browsers = new Set<BrowserPeer>()
  private workspaceId: string | null = null

  constructor(
    storage: ChatStorage,
    env: AppEnv,
    overrides: Partial<ChatDependencies> = {},
  ) {
    this.env = env
    const resolver =
      overrides.resolveLogin ??
      ((userId, agent) => readAgentLogin(env, userId, agent))
    this.dependencies = {
      now: Date.now,
      randomId: randomToken,
      resolveAttachments: async (_userId, _workspaceId, ids) => {
        if (ids.length)
          throw new HttpError(
            503,
            'attachments_unavailable',
            'Attachments are not available. Try again.',
          )
        return { attachments: [], paths: [] }
      },
      receiveFileResult: async () => undefined,
      runnerEventStored: async () => undefined,
      runnerReady: async () => undefined,
      matchesObject: () => true,
      ...overrides,
      resolveLogin: async (userId, agent) => {
        if (
          !this.workspaceId ||
          !(await senderIsMember(env.DB, this.workspaceId, userId))
        )
          return null
        return resolver(userId, agent)
      },
    }
    this.store = new ChatStore(storage, this.dependencies.now)
    this.runner = new RunnerChannel(this.store, this.dependencies, (events) =>
      this.publish(events),
    )
  }

  async fetch(request: Request): Promise<Response> {
    try {
      if (new URL(request.url).pathname === MACHINE_PATHS.runner)
        return await runnerUpgrade(this, request)
      const access = await this.authorizeBrowser(request)
      if (access.suffix === '/events')
        return await browserUpgrade(this, request, access.workspace)
      return await this.store.run(async () => {
        const write = request.method !== 'GET' && request.method !== 'HEAD'
        if (write && access.workspace.archivedAt !== null) {
          throw new HttpError(
            409,
            'workspace_archived',
            'The archived chat is read-only.',
          )
        }
        const response = await this.store.change(
          access.workspace.id,
          (transaction) =>
            chatRoute(
              request,
              access.suffix,
              access.context,
              transaction,
              this.dependencies,
            ),
          (events) => this.publish(events),
        )
        await this.runner.flush()
        return privateResponse(response)
      })
    } catch (error) {
      return privateResponse(errorResponse(error))
    }
  }

  async authorizeBrowser(request: Request): Promise<BrowserAccess> {
    const context = await gate(request, this.env, this.dependencies.now())
    const path = new URL(request.url).pathname
    const match = path.match(/^\/api\/orgs\/[^/]+\/workspaces\/([^/]+)(?:\/|$)/)
    if (!context.org || !match)
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    let workspaceId: string
    try {
      workspaceId = decodeURIComponent(match[1])
    } catch {
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    }
    const workspace = await findChatWorkspace(
      this.env.DB,
      context.org.id,
      workspaceId,
    )
    if (!workspace)
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    this.bind(workspace.id)
    return {
      context,
      workspace,
      suffix: path.slice(workspacePath(context.org.id, workspace.id).length),
    }
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

  /** Trusted feature owners share the same stored browser event sequence. */
  async appendWorkspaceEvent(
    workspaceId: string,
    event: WorkspaceEvent,
    occurredAt = this.dependencies.now(),
  ): Promise<void> {
    this.bind(workspaceId)
    return this.store.run(() =>
      this.store.change(
        workspaceId,
        (transaction) => transaction.emit(event, occurredAt),
        (events) => this.publish(events),
      ),
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
    return this.subscribe(
      access.workspace.id,
      afterNumber(new URL(request.url)),
      peer,
    )
  }

  subscribe(
    workspaceId: string,
    after: number,
    peer: BrowserPeer,
  ): Promise<() => void> {
    return this.store.run(async () => {
      const history = await this.store.read(workspaceId, (view) =>
        view.history(after),
      )
      peer.send({ type: 'history', history })
      this.browsers.add(peer)
      return () => this.browsers.delete(peer)
    })
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

  private publish(events: readonly WorkspaceEventEnvelope[]): void {
    for (const envelope of events) {
      for (const peer of this.browsers) {
        try {
          peer.send({ type: 'event', envelope })
        } catch {
          this.browsers.delete(peer)
          peer.close()
        }
      }
    }
  }
}
