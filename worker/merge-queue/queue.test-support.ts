import { createHmac } from 'node:crypto'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { mergeQueuePaths } from '../../src/shared/merge-queue'
import {
  OUTER_MACHINE_ORIGIN,
  outerWorkerBundle,
} from '../chat/integration/outer-runtime.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_SECTION,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { CLAUDE } from '../chat/harness.test-support'
import { featureFixture } from '../features/fixture.test-support'
import { repositoryPull } from '../github/fake-pull'
import { RepositoryGitHub } from '../github/fake-repository'
import { saveGitHubTokens } from '../security/github-tokens'
import { queueId } from './contracts'
import { readQueueEntries } from './data'

export const PARALLEL = 'parallel workspace'
export const FOREIGN = 'foreign workspace'
export const OWNER_TOKEN = 'owner-queue-token'
export const MEMBER_TOKEN = 'member-queue-token'
const QUEUE_WEBHOOK_SECRET = 'merge-queue-webhook-secret'
export const queueBundle = () =>
  outerWorkerBundle('worker/features/entry.test-support.ts')

async function seedWorkspace(
  db: D1Database,
  workspaceId: string,
  orgId: string,
  repositoryId: string,
  sectionId: string,
  userId: string,
  branch: string,
) {
  await db.batch([
    db
      .prepare(
        `INSERT INTO workspaces (id, org_id, repository_id, section_id, owner_user_id, name,
         branch, state, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'stopped', 2, 2)`,
      )
      .bind(
        workspaceId,
        orgId,
        repositoryId,
        sectionId,
        userId,
        workspaceId,
        branch,
      ),
    db
      .prepare(
        `INSERT INTO workspace_runtime
       (workspace_id, org_id, created_by_user_id, session_id, first_turn_id,
        agent, model, effort, first_message_id)
       VALUES (?, ?, ?, ?, ?, 'claude', 'test-claude', 'high', ?)`,
      )
      .bind(
        workspaceId,
        orgId,
        userId,
        `session-${workspaceId}`,
        `turn-${workspaceId}`,
        `message-${workspaceId}`,
      ),
  ])
}

export async function queueFixture(bundle: string, privateKey?: string) {
  let api: RepositoryGitHub | undefined
  const fixture = await featureFixture(bundle, {
    configuration: {
      GITHUB_APP_PRIVATE_KEY: privateKey,
      GITHUB_WEBHOOK_SECRET: QUEUE_WEBHOOK_SECRET,
      OPERATOR_GITHUB_IDS: '103',
      CONDUCTIVE_DEFAULT_CHOICE: JSON.stringify(CLAUDE),
      // A Fast-capable model, so that a restack test can show Fast off.
      CONDUCTIVE_MODELS: JSON.stringify([
        { ...CLAUDE, label: 'Claude', efforts: ['high'] },
        {
          agent: 'claude',
          model: 'test-claude-new',
          label: 'Claude new',
          efforts: ['medium'],
          fast: true,
        },
      ]),
    },
    outbound: (request, fallback) => {
      const path = new URL(request.url).pathname
      if (privateKey && path === '/app/installations/1/access_tokens')
        return Promise.resolve(
          Response.json({ token: 'queue-installation-read-token' }),
        )
      return api && (path === '/graphql' || path.startsWith('/repos/'))
        ? api.fetch(request)
        : fallback(request)
    },
  })
  const db = fixture.env.DB
  try {
    api = new RepositoryGitHub(fixture.github)
    api.pulls[3] = repositoryPull({
      number: 3,
      headRefName: 'layer-two',
      baseRefName: 'changes',
      headRefOid: 'layer-two-head',
    })
    api.pulls[4] = repositoryPull({
      number: 4,
      headRefName: 'parallel',
      headRefOid: 'parallel-head',
    })
    api.branches.set('refs/heads/layer-two', 'layer-two-head')
    api.branches.set('refs/heads/parallel', 'parallel-head')
    await db.batch([
      db.prepare(
        "INSERT INTO github_installations (id, account_login, account_type, created_at) VALUES (1, 'Codertocat', 'User', 1)",
      ),
      db
        .prepare(
          'UPDATE repositories SET github_repository_id = ?, full_name = ?, installation_id = 1 WHERE id = ?',
        )
        .bind(api.repositoryId, api.fullName, OUTER_REPOSITORY),
      db
        .prepare(
          "UPDATE workspaces SET branch = 'changes', state = 'stopped' WHERE id = ?",
        )
        .bind(OUTER_WORKSPACE),
      db
        .prepare(
          "UPDATE workspaces SET branch = 'layer-two', state = 'stopped' WHERE id = ?",
        )
        .bind(OTHER_WORKSPACE),
      db.prepare(
        "INSERT INTO sections (id, org_id, name, is_default, position, created_at) VALUES ('other-section', 'other-org', 'General', 1, 0, 1)",
      ),
      db
        .prepare(
          "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, installation_id) VALUES ('foreign-repo', 'other-org', ?, ?, 'main', 1)",
        )
        .bind(api.repositoryId, api.fullName),
    ])
    await seedWorkspace(
      db,
      PARALLEL,
      OUTER_ORG,
      OUTER_REPOSITORY,
      OUTER_SECTION,
      'owner',
      'parallel',
    )
    await seedWorkspace(
      db,
      FOREIGN,
      'other-org',
      'foreign-repo',
      'other-section',
      'outsider',
      'parallel',
    )
    for (const [userId, token] of [
      ['owner', OWNER_TOKEN],
      ['member', MEMBER_TOKEN],
      ['outsider', 'outsider-queue-token'],
    ])
      await saveGitHubTokens(
        fixture.env,
        userId,
        {
          accessToken: token,
          expiresAt: null,
          refreshToken: null,
          refreshExpiresAt: null,
        },
        Date.now(),
      )
    const githubRepositoryId = api.repositoryId
    const scope = { orgId: OUTER_ORG, githubRepositoryId }
    return {
      ...fixture,
      api,
      db,
      scope,
      entries: (orgId = OUTER_ORG) =>
        readQueueEntries(db, queueId({ orgId, githubRepositoryId })),
      change: (
        method: 'POST' | 'PUT' | 'DELETE',
        workspaceId: string,
        options: {
          orgId?: string
          cookie?: string
          body?: object
        } = {},
      ) => {
        const {
          orgId = OUTER_ORG,
          cookie = fixture.cookies.ownerCookie,
          body = {},
        } = options
        return fixture.request(
          (method === 'PUT' ? mergeQueuePaths.order : mergeQueuePaths.entry)(
            orgId,
            workspaceId,
          ),
          { method, headers: { Cookie: cookie }, body: JSON.stringify(body) },
        )
      },
    }
  } catch (error) {
    await fixture.dispose()
    throw error
  }
}

export type QueueFixture = Awaited<ReturnType<typeof queueFixture>>

export function queueWebhook(
  { runtime }: Pick<QueueFixture, 'runtime'>,
  event: string,
  delivery: string,
  payload: unknown,
) {
  const body = JSON.stringify(payload)
  const signature = createHmac('sha256', QUEUE_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')
  return runtime.dispatchFetch(
    `${OUTER_MACHINE_ORIGIN}${MACHINE_PATHS.githubWebhook}`,
    {
      method: 'POST',
      body,
      headers: {
        'X-Hub-Signature-256': `sha256=${signature}`,
        'X-GitHub-Event': event,
        'X-GitHub-Delivery': delivery,
      },
    },
  )
}

/**
 * Hide the Claude login of a member, so that each restack message that the
 * member queued waits for an agent login. The returned function shows the
 * login again.
 */
export async function hideAgentLogin(db: D1Database, userId: string) {
  const move = (from: string, to: string) =>
    db
      .prepare(
        'UPDATE agent_logins SET agent = ? WHERE user_id = ? AND agent = ?',
      )
      .bind(to, userId, from)
      .run()
  await move('claude', 'codex')
  return async () => {
    await move('codex', 'claude')
  }
}
