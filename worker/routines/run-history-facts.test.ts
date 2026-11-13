import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { leaveOrgPath } from '../../src/shared/orgs'
import { routinePaths } from '../../src/shared/routines'
import { membersClient, signIn, write } from '../members/members-test-support'
import { saveGitHubTokens } from '../security/github-tokens'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { readRoutine } from './routine-data'
import { readRoutineRun } from './run-list-data'
import { startRoutineRun } from './run-starter'
import { runFixture } from './runs.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('keeps a failed runs agent after the routine changes agent', async () => {
  const h = await runFixture(harness)
  const db = h.runtime.env.DB
  await h.seedRun()
  await db.prepare('DELETE FROM agent_logins').run()
  await startRoutineRun(h.runtime, h.org.id, 'run-one')
  await db
    .prepare(
      "UPDATE routines SET agent = 'claude', model = 'new-model', effort = 'low'",
    )
    .run()
  const response = await harness.request(
    routinePaths.runs(h.org.id, 'routine-one'),
    h.session,
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    runs: [
      {
        state: 'failed',
        agent: 'codex',
        error: {
          code: 'agent_login_required',
          message: 'Connect Codex to run this routine.',
        },
      },
    ],
  })
})

it('keeps a failed runs owner after membership removal moves the routine', async () => {
  const h = await runFixture(harness)
  const db = h.runtime.env.DB
  await h.seedRun()
  await db.prepare('DELETE FROM agent_logins').run()
  await startRoutineRun(h.runtime, h.org.id, 'run-one')
  const replacement = await signIn(harness, 44, 'replacement')
  await db
    .prepare(
      "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'admin', ?)",
    )
    .bind(h.org.id, replacement.user.id, TEST_TIME)
    .run()
  const left = await membersClient(harness).request(
    leaveOrgPath(h.org.id),
    h.session,
    write({}),
  )
  expect(left.status).toBe(204)
  expect((await readRoutine(db, h.org.id, 'routine-one')).owner.id).toBe(
    replacement.user.id,
  )
  const response = await harness.request(
    routinePaths.runs(h.org.id, 'routine-one'),
    replacement.session,
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    runs: [
      {
        state: 'failed',
        agent: 'codex',
        owner: {
          id: h.user.id,
          githubLogin: h.user.githubLogin,
          displayName: h.user.displayName,
          avatarUrl: h.user.avatarUrl,
        },
      },
    ],
  })
})

it('uses one recorded agent choice when the routine changes between its login check and create', async () => {
  const h = await runFixture(harness)
  await h.seedRun()
  const originalFetch = h.runtime.dependencies.fetch
  const runtime = {
    ...h.runtime,
    dependencies: {
      ...h.runtime.dependencies,
      fetch: async (...args: Parameters<typeof originalFetch>) => {
        await h.runtime.env.DB.prepare(
          "UPDATE routines SET agent = 'claude', model = 'new-model', effort = 'low'",
        ).run()
        return originalFetch(...args)
      },
    },
  }
  // The token refresh puts the edit between the starter's two routine reads.
  await saveGitHubTokens(
    h.runtime.env,
    h.user.id,
    {
      accessToken: 'expired',
      refreshToken: 'refresh',
      expiresAt: TEST_TIME - 1,
      refreshExpiresAt: TEST_TIME + 86_400_000,
    },
    TEST_TIME,
  )
  await h.run(() => startRoutineRun(runtime, h.org.id, 'run-one'))
  expect(
    await h.runtime.env.DB.prepare(
      'SELECT agent, model, effort, fast FROM workspace_runtime',
    ).first(),
  ).toEqual({ agent: 'codex', model: 'run-model', effort: 'high', fast: 0 })
  expect(
    await readRoutineRun(h.runtime.env.DB, h.org.id, 'run-one'),
  ).toMatchObject({ agent: 'codex', error: null })
})

it('returns no agent for a historical run without a recorded choice', async () => {
  const h = await runFixture(harness)
  await h.seedRun()
  await h.runtime.env.DB.prepare(
    "UPDATE routine_runs SET state = 'failed', error_code = 'agent_login_required'",
  ).run()
  expect(
    await readRoutineRun(h.runtime.env.DB, h.org.id, 'run-one'),
  ).toMatchObject({ agent: null, owner: { id: h.user.id } })
})
