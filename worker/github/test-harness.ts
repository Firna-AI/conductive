import { createHmac } from 'node:crypto'

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
import { handleGitHubWebhook } from './webhook'
import { refreshWorkspace } from './refresh'
import { MemoryWorkspace } from './memory-workspace'

export const MACHINE_ORIGIN = 'https://machines.conductive.test'
export const WEBHOOK_SECRET = 'test-only-webhook-secret'

export class GitHubTestHarness {
  readonly base: TestHarness
  readonly env: AppEnv
  api: RepositoryGitHub
  states = new Map<string, MemoryWorkspace>()
  tokens: GitHubWorkspace[] = []

  constructor(base: TestHarness) {
    this.base = base
    this.env = base.env
    this.api = new RepositoryGitHub(base.github)
  }

  async reset() {
    await this.base.reset()
    this.api = new RepositoryGitHub(this.base.github)
    this.states = new Map()
    this.tokens = []
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
    return { session, orgId: org, workspace, userId }
  }

  memory(id: string): MemoryWorkspace {
    let memory = this.states.get(id)
    if (!memory) {
      memory = new MemoryWorkspace(id)
      this.states.set(id, memory)
    }
    return memory
  }

  refresh = (workspace: GitHubWorkspace, signal: GitHubRefresh) =>
    refreshWorkspace(
      this.env.DB,
      workspace,
      signal,
      this.memory(workspace.id).state,
      {
        now: () => TEST_TIME,
        token: async (target) => {
          this.tokens.push(target)
          return 'server-read-token'
        },
        fetch: (request) => this.api.fetch(request),
      },
    )

  runScheduled(workspaceId: string) {
    const scheduled = this.memory(workspaceId).scheduled.shift()
    if (!scheduled) throw new Error('No scheduled GitHub refresh')
    return this.refresh(scheduled.request.workspace, scheduled.request.signal)
  }

  read(path: string, session = '', init: RequestInit = {}) {
    const headers = new Headers(init.headers)
    headers.set('Cookie', session)
    return handleGitHubRead(
      new Request(`${TEST_ORIGIN}${path}`, { ...init, headers }),
      this.env,
      { now: () => TEST_TIME, refresh: this.refresh },
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
      { now: () => TEST_TIME, refresh: this.refresh },
    )
  }
}

export async function createGitHubHarness() {
  return new GitHubTestHarness(await createHarness())
}
