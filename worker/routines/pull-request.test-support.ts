import { createHmac } from 'node:crypto'

import type { RoutineTrigger } from '../../src/shared/routines'
import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { GitHubRefreshWorkspace } from '../github/contracts'
import { recordedPullRequest } from '../github/recorded-webhooks'
import { handleGitHubWebhook } from '../github/webhook'
import { WEBHOOK_SECRET } from '../github/test-harness'
import type { TestHarness } from '../test-support/harness'
import { dispatchPullRequestRuns } from './pull-request-dispatch'
import { runFixture } from './runs.test-support'

export async function pullRequestFixture(harness: TestHarness) {
  const fixture = await runFixture(harness)
  const db = fixture.runtime.env.DB
  await db
    .prepare(
      "INSERT INTO github_installations (id, account_login, account_type, created_at) VALUES (91, 'example', 'Organization', 0)",
    )
    .run()
  const configure = (
    triggers: readonly RoutineTrigger[] = [
      { kind: 'pull-request', event: 'opened' },
      { kind: 'pull-request', event: 'pushed' },
      { kind: 'pull-request', event: 'merged' },
    ],
  ) =>
    db
      .prepare(
        "UPDATE routines SET next_run_at = NULL, triggers_json = ? WHERE id = 'routine-one'",
      )
      .bind(JSON.stringify(triggers))
      .run()
  await configure()
  const payload = (action = 'opened', authorId = 7, senderId = 7) => ({
    ...recordedPullRequest,
    action,
    repository: { id: 1 },
    installation: { id: 91 },
    sender: { id: senderId, login: 'event-sender' },
    pull_request: {
      ...recordedPullRequest.pull_request,
      merged: action === 'closed',
      html_url: 'https://github.com/example/repository/pull/2',
      user: { id: authorId, login: 'pull-author' },
      head: { ...recordedPullRequest.pull_request.head, repo: { id: 1 } },
      base: { ref: 'release/next', repo: { id: 1 } },
    },
  })
  const background: (() => Promise<void>)[] = []
  const request = async (
    value: unknown,
    delivery = 'pull-delivery',
    refresh: GitHubRefreshWorkspace = async () => null,
    failDispatch = false,
  ) => {
    const body = JSON.stringify(value)
    const signed = new Request(
      `${fixture.runtime.env.MACHINE_ORIGIN}${MACHINE_PATHS.githubWebhook}`,
      {
        method: 'POST',
        body,
        headers: {
          'X-GitHub-Event': 'pull_request',
          'X-GitHub-Delivery': delivery,
          'X-Hub-Signature-256': `sha256=${createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')}`,
        },
      },
    )
    return handleGitHubWebhook(
      signed,
      {
        DB: db,
        MACHINE_ORIGIN: fixture.runtime.env.MACHINE_ORIGIN ?? '',
        GITHUB_WEBHOOK_SECRET: WEBHOOK_SECRET,
      },
      {
        now: fixture.runtime.dependencies.now,
        refresh,
        pullRequest: async (event, id) => {
          if (failDispatch) throw new Error('Injected dispatch failure')
          await dispatchPullRequestRuns(fixture.runtime, event, id, (work) =>
            background.push(work),
          )
        },
      },
    )
  }
  const rows = () =>
    db
      .prepare(
        `SELECT state, error_code AS code, error_message AS message,
    run_key AS runKey, trigger_json AS triggerJson FROM routine_runs ORDER BY created_at, id`,
      )
      .all<{
        state: string
        code: string | null
        message: string | null
        runKey: string
        triggerJson: string
      }>()
  return {
    ...fixture,
    db,
    configure,
    payload,
    background,
    request,
    rows,
  }
}
