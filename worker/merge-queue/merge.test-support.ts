import { generateKeyPairSync } from 'node:crypto'
import { expect } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { mergeQueuePaths } from '../../src/shared/merge-queue'
import {
  OUTER_ORG,
  OTHER_WORKSPACE,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { HEAD_SHA, passedRun } from '../github/fake-pull'
import { createPullRequestStack } from '../github/stack-client'
import { queueId } from './contracts'
import {
  MEMBER_TOKEN,
  OWNER_TOKEN,
  PARALLEL,
  queueFixture,
} from './queue.test-support'

let key: string | undefined
export const TRUNK_HEAD = '1'.repeat(40)
export const TOP_HEAD = '3'.repeat(40)
export const PARALLEL_HEAD = '4'.repeat(40)

export async function mergeFixture(
  bundle: string,
  mode: 'stack' | 'units' | 'single' | 'empty' = 'stack',
) {
  key ??= generateKeyPairSync('rsa', { modulusLength: 2048 })
    .privateKey.export({ type: 'pkcs1', format: 'pem' })
    .toString()
  const f = await queueFixture(bundle, key)
  try {
    const queue = f.actor(queueId(f.scope))
    const top = mode === 'units' ? PARALLEL : OTHER_WORKSPACE
    const pullNumber = mode === 'units' ? 4 : 3
    const branch = mode === 'units' ? 'parallel' : 'layer-two'
    f.api.branches.set('refs/heads/main', TRUNK_HEAD)
    f.api.branches.set('refs/heads/layer-two', TOP_HEAD)
    f.api.branches.set('refs/heads/parallel', PARALLEL_HEAD)
    f.api.pulls[3].headRefOid = TOP_HEAD
    f.api.pulls[4].headRefOid = PARALLEL_HEAD
    f.api.mergeBases.set(`${TRUNK_HEAD}...${HEAD_SHA}`, TRUNK_HEAD)
    for (const head of [TOP_HEAD, PARALLEL_HEAD]) {
      f.api.mergeBases.set(`${TRUNK_HEAD}...${head}`, TRUNK_HEAD)
      f.api.mergeBases.set(`${HEAD_SHA}...${head}`, HEAD_SHA)
    }
    if (mode !== 'empty')
      expect((await f.change('POST', OUTER_WORKSPACE)).status).toBe(204)
    if (mode === 'stack' || mode === 'units') {
      expect(
        (await f.change('POST', top, { cookie: f.cookies.memberCookie }))
          .status,
      ).toBe(204)
      f.api.pulls[pullNumber].baseRefName = 'changes'
      const stack = await createPullRequestStack(
        f.api.fetch,
        OWNER_TOKEN,
        f.api.fullName,
        [2, pullNumber],
      )
      await f.db
        .prepare(
          "UPDATE merge_queues SET github_stack_number = ?, stack_writer_user_id = 'owner' WHERE id = ?",
        )
        .bind(stack.number, queueId(f.scope))
        .run()
      await f.db
        .prepare(
          "UPDATE merge_queue_entries SET github_base = 'changes' WHERE pull_number = ?",
        )
        .bind(pullNumber)
        .run()
    }
    f.api.merges.memberDefaults.set(MEMBER_TOKEN, 'REBASE')
    f.api.merges.memberDefaults.set(OWNER_TOKEN, 'SQUASH')
    const writes = () =>
      f.api.requests.filter(
        (request) =>
          request.method === 'PUT' &&
          new URL(request.url).pathname.endsWith('/merge-async'),
      )
    return {
      ...f,
      queue,
      top,
      pullNumber,
      branch,
      writes,
      topChecksRunning() {
        f.api.checks.set(f.api.pulls[pullNumber].headRefOid, [
          {
            ...passedRun,
            status: 'IN_PROGRESS',
            conclusion: null,
            completedAt: null,
          },
        ])
      },
      click(id: string, ahead: number, cookie = f.cookies.memberCookie) {
        return f.request(`${mergeQueuePaths.entry(OUTER_ORG, id)}/merge`, {
          method: 'POST',
          body: JSON.stringify({ ahead }),
          headers: { Cookie: cookie },
        })
      },
      bar: (workspaceId: string) =>
        f.request(githubPaths.banner(OUTER_ORG, workspaceId)),
      records: async () =>
        (
          await f.db
            .prepare(
              'SELECT number, workspace_id AS workspaceId FROM pull_request_merges ORDER BY number',
            )
            .all()
        ).results,
    }
  } catch (error) {
    await f.dispose()
    throw error
  }
}
