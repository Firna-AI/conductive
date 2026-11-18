import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { TEST_TIME } from '../test-support/harness'
import { addMergeMember, createMergeHarness } from './merge.test-support'

let fixture: Awaited<ReturnType<typeof createMergeHarness>>
beforeAll(async () => {
  fixture = await createMergeHarness()
})
beforeEach(async () => {
  await fixture.harness.reset()
  fixture.harness.api.pulls[2].isDraft = true
})
afterAll(async () => {
  await fixture.base.dispose()
})

const ready = (orgId: string, session: string) =>
  fixture.request(githubPaths.ready(orgId, 'workspace-1'), session, {
    method: 'POST',
    body: JSON.stringify({ pullNumber: 2 }),
  })

async function readyWrites(): Promise<number> {
  let writes = 0
  for (const request of fixture.harness.api.requests) {
    if ((await request.clone().text()).includes('mutation MarkReady'))
      writes += 1
  }
  return writes
}

it('checks sign-in, membership, suspension, archival, and tokens before a GitHub request', async () => {
  const { orgId, session, userId } = await fixture.seed()
  expect((await ready(orgId, '')).status).toBe(401)
  const db = fixture.env.DB
  for (const [sql, restore, status] of [
    [
      'UPDATE orgs SET suspended_at = 1',
      'UPDATE orgs SET suspended_at = NULL',
      403,
    ],
    [
      'UPDATE workspaces SET archived_at = 1',
      'UPDATE workspaces SET archived_at = NULL',
      409,
    ],
  ] as const) {
    await db.prepare(sql).run()
    expect((await ready(orgId, session)).status).toBe(status)
    await db.prepare(restore).run()
  }
  await db
    .prepare('DELETE FROM github_connections WHERE user_id = ?')
    .bind(userId)
    .run()
  expect(await (await ready(orgId, session)).json()).toMatchObject({
    error: { code: 'github_reconnect_required' },
  })
  fixture.base.github.profile = { id: 8, login: 'outsider' }
  const outsider = await fixture.base.login()
  expect((await ready(orgId, outsider)).status).toBe(404)
  expect(fixture.harness.api.requests).toEqual([])
})

it('uses the token of the member who presses it', async () => {
  const { orgId } = await fixture.seed()
  const { session } = await addMergeMember(fixture.harness, orgId)
  expect((await ready(orgId, session)).status).toBe(200)
  const tokens: (string | null)[] = []
  for (const request of fixture.harness.api.requests) {
    if ((await request.clone().text()).includes('mutation MarkReady'))
      tokens.push(request.headers.get('Authorization'))
  }
  expect(tokens).toEqual(['Bearer reviewer-token'])
})

it('rechecks revoked access before the GitHub write and before publication', async () => {
  const { orgId, session, userId } = await fixture.seed()
  const other = await addMergeMember(fixture.harness, orgId, 'admin')
  await fixture.env.DB.prepare('UPDATE workspaces SET owner_user_id = ?')
    .bind(other.userId)
    .run()
  fixture.harness.api.onRequest = async (operation) => {
    if (operation === 'ReadyPull')
      await fixture.env.DB.prepare(
        'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
      )
        .bind(orgId, userId)
        .run()
  }
  expect((await ready(orgId, session)).status).toBe(404)
  expect(await readyWrites()).toBe(0)
  expect(fixture.harness.api.pulls[2].isDraft).toBe(true)

  await fixture.env.DB.prepare(
    "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'admin', ?)",
  )
    .bind(orgId, userId, TEST_TIME)
    .run()
  fixture.harness.api.onRequest = async (operation) => {
    if (operation === 'MarkReady')
      await fixture.env.DB.prepare(
        'UPDATE workspaces SET archived_at = 1',
      ).run()
  }
  expect((await ready(orgId, session)).status).toBe(409)
  expect((await fixture.harness.inspect('workspace-1')).published).toEqual([])
})

it('refuses a pull request that is not open, with no GitHub write', async () => {
  const { orgId, session } = await fixture.seed()
  fixture.harness.api.pulls[2].state = 'CLOSED'
  // The lookup still finds the branch, as a closed pull request.
  const response = await ready(orgId, session)
  expect(response.status).toBe(409)
  expect(await response.json()).toMatchObject({
    error: { code: 'github_ready_refused' },
  })
  expect(await readyWrites()).toBe(0)
})
