import { createHmac, generateKeyPairSync } from 'node:crypto'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { AppEnv } from '../env'
import {
  createHarness,
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { handleGitHubRead } from './app-handler'
import type { GitHubRefresh, GitHubWorkspace } from './contracts'
import { activeWorkspace } from './data'
import { RepositoryGitHub } from './fake-repository'
import { handleGitHubWebhook, type GitHubWebhookDependencies } from './webhook'
import { requireFeatureResult } from '../features/result'
import { record, string } from '../chat/inputs'
import type { NativeActor } from '../test-support/native-runtime'
import type { WorkspaceEventEnvelope } from '../chat/workspace-events'
import {
  advanceGitHubAlarm,
  inspectGitHubActor,
} from './native-fixture.test-support'

export const MACHINE_ORIGIN = 'https://machines.conductive.test'
export const WEBHOOK_SECRET = 'test-only-webhook-secret'
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const APP_PRIVATE_KEY = privateKey
  .export({ type: 'pkcs1', format: 'pem' })
  .toString()

export class GitHubTestHarness {
  readonly base: TestHarness
  readonly env: AppEnv
  api: RepositoryGitHub
  actors = new Map<string, NativeActor>()
  private publications = new Map<string, WorkspaceEventEnvelope[]>()
  private workspaces = new Map<string, GitHubWorkspace>()
  tokens: GitHubWorkspace[] = []
  pushed?: GitHubWebhookDependencies['pushed']
  repositoryChange?: GitHubWebhookDependencies['repositoryChange']

  constructor(base: TestHarness) {
    this.base = base
    this.env = base.env
    this.env.GITHUB_APP_PRIVATE_KEY = APP_PRIVATE_KEY
    this.api = new RepositoryGitHub(base.github)
    this.connectGitHub()
  }

  async reset() {
    await this.base.reset()
    this.api = new RepositoryGitHub(this.base.github)
    this.actors.clear()
    this.publications.clear()
    this.workspaces.clear()
    this.connectGitHub()
    this.tokens = []
    this.pushed = undefined
    this.repositoryChange = undefined
  }

  async seed(branch = 'changes', workspaceId = 'workspace-1', orgId?: string) {
    const session = await this.base.login()
    const org = orgId ?? (await this.base.createOrg(session)).id
    const userId = await this.env.DB.prepare(
      'SELECT id FROM users WHERE github_id = 7',
    ).first<string>('id')
    if (userId === null) throw new Error('Missing signed-in test user')
    await this.env.DB.batch([
      this.env.DB.prepare(
        "INSERT OR IGNORE INTO github_installations (id, account_login, account_type, created_at) VALUES (1, 'Codertocat', 'User', ?)",
      ).bind(TEST_TIME),
      this.env.DB.prepare(
        "INSERT OR IGNORE INTO repositories (id, org_id, github_repository_id, full_name, default_branch, installation_id) VALUES (?, ?, 186853002, 'Codertocat/Hello-World', 'main', 1)",
      ).bind(`repo-${org}`, org),
      this.env.DB.prepare(
        "INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, name, branch, created_at, updated_at) VALUES (?, ?, ?, ?, 'Search', ?, ?, ?)",
      ).bind(
        workspaceId,
        org,
        `repo-${org}`,
        userId,
        branch,
        TEST_TIME,
        TEST_TIME,
      ),
    ])
    const workspace = await activeWorkspace(this.env.DB, workspaceId, org)
    if (!workspace) throw new Error('Missing test workspace')
    this.workspaces.set(workspace.id, workspace)
    return { session, orgId: org, workspace, userId }
  }

  private connectGitHub() {
    this.base.setNativeFetch(async (request) => {
      if (new URL(request.url).pathname.endsWith('/access_tokens')) {
        const jwt = request.headers.get('Authorization')?.split(' ')[1] ?? ''
        const payload = record(
          JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()),
        )
        const workspace = this.workspaces.get(string(payload.iss))
        if (!workspace) throw new Error('Unknown GitHub credential workspace')
        this.tokens.push(workspace)
        return Response.json({ token: 'server-read-token' })
      }
      return new URL(request.url).hostname === 'boat.dev'
        ? this.base.boat.fetch(request)
        : this.api.fetch(request)
    })
  }

  actor(id: string): NativeActor {
    let actor = this.actors.get(id)
    if (!actor) {
      actor = this.base.native.actor(id, {
        environment: {
          GITHUB_APP_PRIVATE_KEY: APP_PRIVATE_KEY,
          GITHUB_CLIENT_ID: id,
        },
      })
      this.actors.set(id, actor)
    }
    return actor
  }

  inspect(id: string) {
    let publications = this.publications.get(id)
    if (!publications) {
      publications = []
      this.publications.set(id, publications)
    }
    return inspectGitHubActor(this.actor(id), id, publications)
  }

  async restart(id: string) {
    await this.inspect(id)
    await this.actor(id).restart()
  }

  refresh = async (workspace: GitHubWorkspace, signal: GitHubRefresh) => {
    this.workspaces.set(workspace.id, workspace)
    const actor = this.actor(workspace.id)
    await actor.ready
    return requireFeatureResult(
      await actor.rpc.refreshGitHub(workspace, signal),
    )
  }

  async runScheduled(workspaceId: string) {
    return requireFeatureResult(
      await advanceGitHubAlarm(this.base, this.actor(workspaceId), workspaceId),
    )
  }

  read(path: string, session = '', init: RequestInit = {}) {
    const headers = new Headers(init.headers)
    headers.set('Cookie', session)
    return handleGitHubRead(
      new Request(`${TEST_ORIGIN}${path}`, { ...init, headers }),
      this.env,
      {
        now: () => TEST_TIME,
        refresh: this.refresh,
        stored: (workspace) => this.actor(workspace.id).api.github.stored(),
      },
    )
  }

  webhook(
    event: string,
    payload: unknown,
    deliveryId = 'delivery-1',
    init: RequestInit = {},
    origin = MACHINE_ORIGIN,
    path: string = MACHINE_PATHS.githubWebhook,
  ) {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
    const headers = new Headers({
      'X-GitHub-Event': event,
      'X-GitHub-Delivery': deliveryId,
      'X-Hub-Signature-256': `sha256=${createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')}`,
      ...Object.fromEntries(new Headers(init.headers)),
    })
    return handleGitHubWebhook(
      new Request(`${origin}${path}`, {
        method: 'POST',
        body,
        ...init,
        headers,
      }),
      {
        DB: this.env.DB,
        MACHINE_ORIGIN,
        GITHUB_WEBHOOK_SECRET: WEBHOOK_SECRET,
      },
      {
        now: () => TEST_TIME,
        refresh: this.refresh,
        pushed: this.pushed,
        repositoryChange: this.repositoryChange,
      },
    )
  }
}

export async function createGitHubHarness() {
  return new GitHubTestHarness(await createHarness())
}
