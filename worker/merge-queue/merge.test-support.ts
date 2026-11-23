import { generateKeyPairSync } from 'node:crypto'
import { expect } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { mergeQueuePaths } from '../../src/shared/merge-queue'
import {
  OUTER_ORG,
  OTHER_WORKSPACE,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { passedRun } from '../github/fake-pull'
import { createPullRequestStack } from '../github/stack-client'
import { queueId } from './contracts'
import {
  MEMBER_TOKEN,
  OWNER_TOKEN,
  PARALLEL,
  queueFixture,
} from './queue.test-support'

let key: string | undefined

export async function mergeFixture(
  bundle: string,
  mode: 'stack' | 'units' | 'single' = 'stack',
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
    expect((await f.change('POST', OUTER_WORKSPACE)).status).toBe(204)
    if (mode !== 'single') {
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
        .prepare('UPDATE merge_queues SET github_stack_number = ? WHERE id = ?')
        .bind(stack.number, queueId(f.scope))
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
