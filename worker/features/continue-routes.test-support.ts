import { createHmac, generateKeyPairSync } from 'node:crypto'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { mergeQueuePaths } from '../../src/shared/merge-queue'
import { CLAUDE } from '../chat/harness.test-support'
import { record } from '../chat/inputs'
import { OUTER_MACHINE_ORIGIN } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { repositoryPull } from '../github/fake-pull'
import { RepositoryGitHub } from '../github/fake-repository'
import { CONTINUE_JOB_KEY } from '../lifecycle/continue-types'
import { queueId } from '../merge-queue/contracts'
import { readQueueEntries } from '../merge-queue/data'
import { saveGitHubTokens } from '../security/github-tokens'
import { featureFixture, featureState } from './fixture.test-support'

export async function continueRoutesFixture(
  bundle: string,
  options: Pick<
    NonNullable<Parameters<typeof featureFixture>[1]>,
    'handleStructuredLogs'
  > = {},
) {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const reference: { api?: RepositoryGitHub } = {}
  /** Other repositories of the fake GitHub, read by their full name. */
  const others: RepositoryGitHub[] = []
  const secret = 'continue-webhook-secret'
  const fixture = await featureFixture(bundle, {
    ...options,
    configuration: {
      GITHUB_APP_PRIVATE_KEY: privateKey
        .export({ type: 'pkcs1', format: 'pem' })
        .toString(),
      GITHUB_WEBHOOK_SECRET: secret,
    },
    outbound: (request, fallback) => {
      const path = new URL(request.url).pathname
      if (path === '/app/installations/1/access_tokens')
        return Promise.resolve(Response.json({ token: 'server-read-token' }))
      if (path === '/installation/token' && request.method === 'DELETE')
        return Promise.resolve(new Response(null, { status: 204 }))
      if (path === `/repositories/${reference.api?.repositoryId}`)
        return Promise.resolve(
          Response.json({
            full_name: reference.api?.fullName,
            default_branch: reference.api?.defaultBranch,
          }),
        )
      if (path.startsWith('/repos/') && reference.api)
        return reference.api.fetch(request)
      if (path !== '/graphql' || !reference.api) return fallback(request)
      const api = reference.api
      return request
        .clone()
        .json()
        .then((body) => {
          const variables = record(record(body).variables ?? {})
          const name = `${String(variables.owner)}/${String(variables.name)}`
          return (others.find((other) => other.fullName === name) ?? api).fetch(
            request,
          )
        })
    },
  })
  const api = new RepositoryGitHub(fixture.github)
  reference.api = api
  api.pulls[2] = repositoryPull({
    state: 'MERGED',
    mergedAt: '2026-11-09T12:00:00Z',
  })
  fixture.boat.synchronousOutput = '\0' + '0\n'
  fixture.boat.commandOutput = ''
  fixture.boat.states.set('bx_continue', 'archived')
  await fixture.env.DB.batch([
    fixture.env.DB.prepare(
      "INSERT INTO github_installations (id, account_login, account_type, created_at) VALUES (1, 'Codertocat', 'User', 1)",
    ),
    fixture.env.DB.prepare(
      "UPDATE repositories SET github_repository_id = 186853002, full_name = 'Codertocat/Hello-World', installation_id = 1 WHERE id = 'chat-repository'",
    ),
    fixture.env.DB.prepare(
      "UPDATE workspaces SET branch = 'changes', sandbox_id = 'bx_continue', name = 'Kept workspace' WHERE id = ?",
    ).bind(OUTER_WORKSPACE),
  ])
  const firstSession = `session-${OUTER_WORKSPACE}`
  await fixture.control('initialize', {
    input: {
      workspaceId: OUTER_WORKSPACE,
      orgId: OUTER_ORG,
      firstMessage: {
        id: `message-${OUTER_WORKSPACE}`,
        text: 'The earlier task',
        choice: CLAUDE,
        attachmentIds: [],
      },
      firstTurn: {
        turnId: `turn-${OUTER_WORKSPACE}`,
        sessionId: firstSession,
        senderUserId: 'owner',
      },
    },
  })
  await fixture.control('stopped')
  await fixture.env.DB.prepare(
    'UPDATE workspace_tokens SET revoked_at = 1 WHERE workspace_id = ?',
  )
    .bind(OUTER_WORKSPACE)
    .run()
  for (const userId of ['owner', 'member'])
    await saveGitHubTokens(
      fixture.env,
      userId,
      {
        accessToken: `${userId}-continue-token`,
        expiresAt: null,
        refreshToken: null,
        refreshExpiresAt: null,
      },
      Date.now(),
    )
  const state = async () => featureState(await fixture.control('state'))
  const drive = async (ready: (state: Map<string, unknown>) => boolean) => {
    for (let step = 0; step < 25; step++) {
      const current = await state()
      if (ready(current)) return current
      await fixture.control('seed', {
        values: { 'alarm:continue': 0, 'alarm:lifecycle': 0 },
      })
      await fixture.control('advance')
    }
    throw new Error('The composed Continue did not reach its expected phase.')
  }
  const credential = (workspaceToken: string, fetchId: string) =>
    fixture.runtime.dispatchFetch(
      `${OUTER_MACHINE_ORIGIN}${MACHINE_PATHS.gitCredential}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${workspaceToken}`,
          'X-Conductive-Turn-Id': fetchId,
        },
      },
    )
  const webhook = (
    branch: string,
    delivery: string,
    repositoryId = 186853002,
  ) => {
    const body = JSON.stringify({
      ref: `refs/heads/${branch}`,
      repository: { id: repositoryId },
      installation: { id: 1 },
    })
    return fixture.runtime.dispatchFetch(
      `${OUTER_MACHINE_ORIGIN}${MACHINE_PATHS.githubWebhook}`,
      {
        method: 'POST',
        body,
        headers: {
          'X-GitHub-Event': 'push',
          'X-GitHub-Delivery': delivery,
          'X-Hub-Signature-256': `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`,
        },
      },
    )
  }
  const repositoryWebhook = (delivery: string) => {
    const body = JSON.stringify({
      action: 'edited',
      changes: { default_branch: { from: 'main' } },
      repository: { id: api.repositoryId },
      installation: { id: 1 },
    })
    return fixture.runtime.dispatchFetch(
      `${OUTER_MACHINE_ORIGIN}${MACHINE_PATHS.githubWebhook}`,
      {
        method: 'POST',
        body,
        headers: {
          'X-GitHub-Event': 'repository',
          'X-GitHub-Delivery': delivery,
          'X-Hub-Signature-256': `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`,
        },
      },
    )
  }
  return {
    ...fixture,
    api,
    others,
    firstSession,
    state,
    drive,
    credential,
    webhook,
    repositoryWebhook,
    queueOldBranch: async () => {
      api.pulls[2].state = 'OPEN'
      api.pulls[2].mergedAt = null
      return fixture.request(
        mergeQueuePaths.entry(OUTER_ORG, OUTER_WORKSPACE),
        {
          method: 'POST',
          body: '{}',
        },
      )
    },
    queuedPulls: async () =>
      (
        await readQueueEntries(
          fixture.env.DB,
          queueId({
            orgId: OUTER_ORG,
            githubRepositoryId: api.repositoryId,
          }),
        )
      ).map(({ pullNumber }) => pullNumber),
    activeJob: async () => {
      const value = (await state()).get(CONTINUE_JOB_KEY)
      return value == null ? null : record(value)
    },
  }
}
