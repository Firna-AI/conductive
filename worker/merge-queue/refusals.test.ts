import { beforeAll, expect, it } from 'vitest'

import {
  OTHER_WORKSPACE,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { createPullRequestStack } from '../github/stack-client'
import {
  FOREIGN,
  MEMBER_TOKEN,
  OWNER_TOKEN,
  PARALLEL,
  queueBundle,
  queueFixture,
  type QueueFixture,
} from './queue.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

async function refuses(
  response: Awaited<ReturnType<QueueFixture['change']>>,
  status: number,
  code: string,
) {
  expect(response.status).toBe(status)
  expect(await response.json()).toMatchObject({ error: { code } })
}

it('refuses a missing session, another org, and a workspace outside the org', async () => {
  const f = await queueFixture(bundle)
  try {
    await refuses(
      await f.change('POST', OUTER_WORKSPACE, { cookie: '' }),
      401,
      'sign_in_required',
    )
    await refuses(
      await f.change('POST', OUTER_WORKSPACE, {
        cookie: f.cookies.outsiderCookie,
      }),
      404,
      'org_not_found',
    )
    await refuses(await f.change('POST', FOREIGN), 404, 'workspace_not_found')
    expect(f.api.requests).toHaveLength(0)
    expect(await f.entries()).toEqual([])
  } finally {
    await f.dispose()
  }
})

it('refuses read-only GitHub access, an archived workspace, and a suspended org', async () => {
  const f = await queueFixture(bundle)
  try {
    f.api.merges.memberPermissions.set(MEMBER_TOKEN, 'READ')
    for (const method of ['POST', 'DELETE', 'PUT'] as const)
      await refuses(
        await f.change(method, OUTER_WORKSPACE, {
          cookie: f.cookies.memberCookie,
          body: { beforeWorkspaceId: null },
        }),
        403,
        'merge_queue_write_required',
      )
    await f.db
      .prepare(
        "UPDATE workspaces SET state = 'archived', archived_at = 1 WHERE id = ?",
      )
      .bind(OUTER_WORKSPACE)
      .run()
    await refuses(
      await f.change('POST', OUTER_WORKSPACE),
      409,
      'workspace_archived',
    )
    await f.db
      .prepare("UPDATE orgs SET suspended_at = 1 WHERE id = 'chat-org'")
      .run()
    await refuses(await f.change('POST', OTHER_WORKSPACE), 403, 'org_suspended')
    expect(await f.entries()).toEqual([])
  } finally {
    await f.dispose()
  }
})

it('refuses a closed pull request, a fork, and a unit that targets another branch', async () => {
  const f = await queueFixture(bundle)
  try {
    const pull = f.api.pulls[2]
    pull.state = 'CLOSED'
    await refuses(
      await f.change('POST', OUTER_WORKSPACE),
      409,
      'merge_queue_pull_required',
    )
    pull.state = 'OPEN'
    pull.headRepository = { databaseId: 109 }
    await refuses(
      await f.change('POST', OUTER_WORKSPACE),
      409,
      'merge_queue_fork',
    )
    pull.headRepository = { databaseId: f.api.repositoryId }
    pull.baseRefName = 'develop'
    await refuses(
      await f.change('POST', OTHER_WORKSPACE),
      409,
      'merge_queue_wrong_base',
    )
    expect(await f.entries()).toEqual([])
  } finally {
    await f.dispose()
  }
})

it('requires a lower workspace from the same org and checks the trunk rules', async () => {
  const f = await queueFixture(bundle)
  try {
    await createPullRequestStack(
      f.api.fetch,
      OWNER_TOKEN,
      f.api.fullName,
      [2, 3],
    )
    f.api.pulls[3].baseRefName = 'parallel'
    await refuses(
      await f.change('POST', OTHER_WORKSPACE),
      409,
      'merge_queue_changed',
    )
    await f.db
      .prepare('DELETE FROM workspaces WHERE id = ?')
      .bind(PARALLEL)
      .run()
    await refuses(
      await f.change('POST', OTHER_WORKSPACE),
      409,
      'merge_queue_stack_workspace_missing',
    )
    f.api.branchRules.set('main', [{ type: 'merge_queue' }])
    await refuses(
      await f.change('POST', OUTER_WORKSPACE),
      409,
      'merge_queue_github_required',
    )
    expect(await f.entries()).toEqual([])
  } finally {
    await f.dispose()
  }
})

it('refuses a draft change and hides the GitHub error text', async () => {
  const f = await queueFixture(bundle)
  try {
    f.api.pulls[2].isDraft = true
    f.api.readyRefused = true
    const response = await f.change('POST', OUTER_WORKSPACE)
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: {
        code: 'github_ready_refused',
        message: 'Not marked ready: GitHub refused the change.',
      },
    })
    expect(f.api.pulls[2].isDraft).toBe(true)
    expect(await f.entries()).toEqual([])
  } finally {
    await f.dispose()
  }
})

it('refuses another unit branch, an invalid drop, and a move across a merging entry', async () => {
  const f = await queueFixture(bundle)
  try {
    expect((await f.change('POST', OTHER_WORKSPACE)).status).toBe(204)
    f.api.pulls[4].baseRefName = 'changes'
    await refuses(
      await f.change('POST', PARALLEL),
      409,
      'merge_queue_unit_conflict',
    )
    f.api.pulls[4].baseRefName = 'main'
    expect((await f.change('POST', PARALLEL)).status).toBe(204)
    await refuses(await f.change('PUT', PARALLEL), 400, 'invalid_input')
    await refuses(
      await f.change('PUT', PARALLEL, { body: { beforeWorkspaceId: FOREIGN } }),
      404,
      'merge_queue_entry_not_found',
    )
    await f.db
      .prepare(
        "UPDATE merge_queue_entries SET state = 'merging' WHERE workspace_id = ?",
      )
      .bind(OTHER_WORKSPACE)
      .run()
    await refuses(
      await f.change('DELETE', OUTER_WORKSPACE),
      409,
      'merge_queue_merging',
    )
    await refuses(
      await f.change('PUT', PARALLEL, {
        body: { beforeWorkspaceId: OUTER_WORKSPACE },
      }),
      409,
      'merge_queue_merging',
    )
    expect((await f.entries()).map(({ workspaceId }) => workspaceId)).toEqual([
      OUTER_WORKSPACE,
      OTHER_WORKSPACE,
      PARALLEL,
    ])
  } finally {
    await f.dispose()
  }
})
