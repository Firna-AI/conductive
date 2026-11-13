import { DurableObject } from 'cloudflare:workers'

import {
  workspaceEventsPath,
  type WorkspaceSocketMessage,
} from '../../src/shared/events'
import { githubSummary } from '../../src/shared/github'
import { WorkspaceChat } from '../chat/backend'
import { chatDependencies } from '../chat/dependencies'
import { createSession } from '../chat/sessions'
import type { ChatData, ChatStorage } from '../chat/types'
import { sessionUser } from '../data/users'
import type { AppEnv } from '../env'
import { createGitHubStatePort } from './chat-store'
import type { GitHubWorkspace } from './contracts'
import { queuedAccessRace } from './queued-access.test-support'
import {
  SQLITE_CHOICE,
  SQLITE_TIME,
  SQLITE_WORKSPACE_ID,
  sqlitePullSnapshot,
  sqliteSnapshot,
} from './sqlite-fixtures.test-support'
import { saveWorkspaceGitHubSummary } from './summary-data'
import { WorkspaceGitHubState } from './workspace-state'

const GITHUB_WORKSPACE: GitHubWorkspace = {
  id: SQLITE_WORKSPACE_ID,
  orgId: 'org',
  branch: 'owner/workspace',
  repositoryId: 10,
  fullName: 'owner/repo',
  defaultBranch: 'main',
  installationId: 10,
}

export class Workspace extends DurableObject<AppEnv> {
  private readonly chat: WorkspaceChat
  private readonly github: WorkspaceGitHubState
  private readonly messages: WorkspaceSocketMessage[] = []
  private readonly staged: unknown[] = []
  private interleaved: Promise<unknown> | null = null
  private failReceipt = false
  private interleave = false
  private reads = 0
  private now = SQLITE_TIME

  constructor(ctx: DurableObjectState, env: AppEnv) {
    super(ctx, env)
    const dependencies = chatDependencies(env, () => SQLITE_WORKSPACE_ID)
    const storage: ChatStorage = {
      ...this.data(ctx.storage),
      transaction: (work) =>
        ctx.storage.transaction(async (native) => {
          const data = this.data(native)
          const result = await work(data)
          const snapshot = await data.get<unknown>('github:state')
          if (snapshot !== undefined) {
            this.staged.push({
              snapshot,
              records: [...(await data.list({ prefix: '' }))],
              messages: structuredClone(this.messages),
            })
            if (this.interleave) {
              this.interleave = false
              this.interleaved = this.chat.changeWorkspace(
                SQLITE_WORKSPACE_ID,
                async (transaction) => {
                  const startedBy = await sessionUser(
                    env.DB,
                    'session',
                    this.now,
                  )
                  if (!startedBy)
                    throw new Error('The fixture session is missing.')
                  return createSession(
                    transaction,
                    SQLITE_CHOICE,
                    'interleaved',
                    startedBy,
                    dependencies,
                  )
                },
              )
            }
          }
          return result
        }),
    }
    this.chat = new WorkspaceChat(storage, env, {
      now: () => this.now,
      randomId: () => 'first-session',
      scheduleBrowserCheck: () => () => undefined,
    })
    this.github = new WorkspaceGitHubState(
      createGitHubStatePort(
        this.chat,
        SQLITE_WORKSPACE_ID,
        async () => undefined,
      ),
    )
  }

  private data(native: ChatData): ChatData {
    return {
      get: (key) => native.get(key),
      put: async (key, value) => {
        if (this.failReceipt && key.startsWith('github:delivery:'))
          throw new Error('Injected receipt write failure')
        await native.put(key, value)
      },
      list: (options) => native.list(options),
      delete: (key) => native.delete(key),
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    try {
      if (url.pathname === '/access-race')
        return await queuedAccessRace(
          this.chat,
          this.env.DB,
          url.searchParams.get('operation') === 'replay',
        )
      if (url.pathname === '/observe') {
        await this.chat.openBrowser(
          new Request(
            new URL(workspaceEventsPath('org', SQLITE_WORKSPACE_ID), url),
            request,
          ),
          {
            send: (message) => this.messages.push(structuredClone(message)),
            close: () => undefined,
          },
        )
        return new Response(null, { status: 204 })
      }
      if (url.pathname === '/inspect') {
        return Response.json({
          records: [...(await this.ctx.storage.list({ prefix: '' }))],
          messages: this.messages,
          staged: this.staged,
          reads: this.reads,
        })
      }
      if (url.pathname === '/refresh') {
        this.now = Number(url.searchParams.get('time') ?? SQLITE_TIME)
        this.failReceipt = url.searchParams.has('fail-receipt')
        this.interleave = url.searchParams.has('interleave')
        const deliveryId = url.searchParams.get('delivery')
        const snapshot = await this.github.refresh(
          async () => {
            this.reads++
            if (url.searchParams.has('forbid-read'))
              throw new Error('Replay read GitHub')
            return url.searchParams.has('pull-request')
              ? sqlitePullSnapshot()
              : sqliteSnapshot()
          },
          async () => undefined,
          deliveryId === null ? {} : { deliveryId },
          (committed) =>
            saveWorkspaceGitHubSummary(
              this.env.DB,
              GITHUB_WORKSPACE,
              githubSummary(committed.banner),
            ),
        )
        await this.interleaved
        return Response.json({ snapshot })
      }
      return this.chat.fetch(request)
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      )
    }
  }
}
