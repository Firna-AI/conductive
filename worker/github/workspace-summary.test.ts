import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { githubPaths } from '../../src/shared/github'
import { workspacesPath } from '../../src/shared/workspaces'
import { TEST_TIME } from '../test-support/harness'
import { readWorkspace, workspaceView } from '../lifecycle/workspace-data'
import { HEAD_SHA, passedRun } from './fake-pull'
import { recordedStatus } from './recorded-webhooks'
import { createGitHubHarness, type GitHubTestHarness } from './test-harness'

let harness: GitHubTestHarness
beforeAll(async () => {
  harness = await createGitHubHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.base.dispose()
})

async function seed() {
  const fixture = await harness.seed()
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      "UPDATE workspaces SET section_id = ?, state = 'input' WHERE id = ?",
    ).bind(`general-${fixture.orgId}`, fixture.workspace.id),
    harness.env.DB.prepare(
      `INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id,
      session_id, first_turn_id, first_message_id, agent, model, effort)
      VALUES (?, ?, ?, 'session', 'turn', 'message', 'codex', 'test-model', 'high')`,
    ).bind(fixture.workspace.id, fixture.orgId, fixture.userId),
  ])
  return fixture
}

async function list(fixture: Awaited<ReturnType<typeof seed>>) {
  const response = await harness.base.request(
    workspacesPath(fixture.orgId),
    fixture.session,
  )
  expect(response.status).toBe(200)
  return response.json()
}

it('copies webhook failures and later read successes into list records without changing activity or order', async () => {
  const fixture = await seed()
  const persisted = {
    updated_at: TEST_TIME - 5_000,
    last_activity_at: TEST_TIME - 7_000,
    position: 13,
  }
  await harness.env.DB.prepare(
    'UPDATE workspaces SET updated_at = ?, last_activity_at = ?, position = ? WHERE id = ?',
  )
    .bind(
      persisted.updated_at,
      persisted.last_activity_at,
      persisted.position,
      fixture.workspace.id,
    )
    .run()
  const metadata = () =>
    harness.env.DB.prepare(
      'SELECT updated_at, last_activity_at, position FROM workspaces WHERE id = ?',
    )
      .bind(fixture.workspace.id)
      .first()
  const original = await metadata()
  expect(original).toEqual(persisted)
  expect(await list(fixture)).toMatchObject({ workspaces: [{ github: null }] })
  harness.api.checks.set(HEAD_SHA, [{ ...passedRun, conclusion: 'FAILURE' }])
  expect(
    (await harness.webhook('status', recordedStatus, 'failed')).status,
  ).toBe(204)
  expect(await list(fixture)).toMatchObject({
    workspaces: [{ github: 'checks-failed', updatedAt: TEST_TIME - 5_000 }],
  })
  expect(
    workspaceView(
      await readWorkspace(harness.env.DB, fixture.orgId, fixture.workspace.id),
      harness.env.APP_ORIGIN,
    ).github,
  ).toBe('checks-failed')
  harness.api.checks.set(HEAD_SHA, [passedRun])
  expect(
    (
      await harness.read(
        githubPaths.banner(fixture.orgId, fixture.workspace.id),
        fixture.session,
      )
    ).status,
  ).toBe(200)
  expect(await list(fixture)).toMatchObject({
    workspaces: [{ github: 'checks-passed' }],
  })
  expect(await metadata()).toEqual(original)
  expect(await metadata()).toEqual(persisted)
})

it('replays an older delivery event without replacing the newer workspace summary', async () => {
  const fixture = await seed()
  harness.api.checks.set(HEAD_SHA, [{ ...passedRun, conclusion: 'FAILURE' }])
  expect(
    (await harness.webhook('status', recordedStatus, 'older')).status,
  ).toBe(204)
  harness.api.checks.set(HEAD_SHA, [passedRun])
  await harness.refresh(fixture.workspace, {})
  const reads = harness.api.requests.length
  await harness.env.DB.prepare(
    'UPDATE workspaces SET github_summary = NULL WHERE id = ?',
  )
    .bind(fixture.workspace.id)
    .run()
  const replay = await harness.refresh(fixture.workspace, {
    deliveryId: 'older',
  })
  expect(replay?.banner.state).toBe('checks-failed')
  expect(await list(fixture)).toMatchObject({
    workspaces: [{ github: 'checks-passed' }],
  })
  expect(harness.api.requests).toHaveLength(reads)
  expect(
    harness
      .memory(fixture.workspace.id)
      .events.map((event) => event.eventNumber),
  ).toEqual([1, 2])
  expect(
    harness
      .memory(fixture.workspace.id)
      .published.map((event) => event.eventNumber),
  ).toEqual([1, 2, 1])
  const branch = 'owner/continued'
  await harness.env.DB.prepare(
    'UPDATE workspaces SET branch = ?, github_summary = NULL WHERE id = ?',
  )
    .bind(branch, fixture.workspace.id)
    .run()
  await harness.refresh(
    { ...fixture.workspace, branch },
    { deliveryId: 'older' },
  )
  expect(await list(fixture)).toMatchObject({ workspaces: [{ github: null }] })
  expect(harness.api.requests).toHaveLength(reads)
})

it('repairs a missing summary on an unchanged read and skips a matching copy', async () => {
  const fixture = await seed()
  await harness.refresh(fixture.workspace, {})
  await harness.env.DB.prepare(
    'UPDATE workspaces SET github_summary = NULL WHERE id = ?',
  )
    .bind(fixture.workspace.id)
    .run()
  await harness.refresh(fixture.workspace, {})
  expect(await list(fixture)).toMatchObject({
    workspaces: [{ github: 'checks-passed' }],
  })
  await harness.env.DB.prepare(
    `CREATE TRIGGER forbid_matching_github_summary BEFORE UPDATE OF github_summary ON workspaces
    WHEN OLD.github_summary IS NEW.github_summary BEGIN SELECT RAISE(ABORT, 'Matching copy must not write'); END`,
  ).run()
  try {
    await harness.refresh(fixture.workspace, {})
  } finally {
    await harness.env.DB.prepare(
      'DROP TRIGGER forbid_matching_github_summary',
    ).run()
  }
  expect(
    harness
      .memory(fixture.workspace.id)
      .events.map((event) => event.eventNumber),
  ).toEqual([1])
})

it('fails a refresh on a failed copy and retries its receipt without a fresh event or GitHub request', async () => {
  const fixture = await seed()
  await harness.env.DB.prepare(
    `CREATE TRIGGER fail_github_summary BEFORE UPDATE OF github_summary ON workspaces
    BEGIN SELECT RAISE(ABORT, 'Injected summary copy failure'); END`,
  ).run()
  let failed: Response
  try {
    failed = await harness.webhook('status', recordedStatus, 'copy-failure')
  } finally {
    await harness.env.DB.prepare('DROP TRIGGER fail_github_summary').run()
  }
  expect(failed.status).toBe(500)
  expect(await failed.json()).toMatchObject({
    error: { code: 'internal_error' },
  })
  const reads = harness.api.requests.length
  harness.memory(fixture.workspace.id).restart()
  expect(
    (await harness.webhook('status', recordedStatus, 'copy-failure')).status,
  ).toBe(204)
  expect(await list(fixture)).toMatchObject({
    workspaces: [{ github: 'checks-passed' }],
  })
  expect(harness.api.requests).toHaveLength(reads)
  expect(
    harness
      .memory(fixture.workspace.id)
      .events.map((event) => event.eventNumber),
  ).toEqual([1])
  expect(
    harness
      .memory(fixture.workspace.id)
      .published.map((event) => event.eventNumber),
  ).toEqual([1, 1])
})
