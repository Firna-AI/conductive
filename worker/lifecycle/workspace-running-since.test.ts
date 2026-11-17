import { expect, it } from 'vitest'

import {
  seedListWorkspaces,
  setupShellListTests,
} from '../app-api/shell-list.test-support'
import { TEST_TIME } from '../test-support/harness'
import { beginningLifecycleStart, initialLifecycle } from './durable-start'
import { FIRST_MESSAGE } from './durable-test-support'
import { persistLifecycleState } from './workspace-data'

const fixtureForTest = setupShellListTests()

async function runningFixture() {
  const fixture = fixtureForTest()
  await seedListWorkspaces(fixture, [
    { id: 'run', sectionId: fixture.generalId, position: 0 },
  ])
  const lifecycle = beginningLifecycleStart(
    initialLifecycle(
      {
        workspaceId: 'run',
        orgId: fixture.orgId,
        firstMessage: FIRST_MESSAGE,
      },
      TEST_TIME,
    ),
    'create',
    TEST_TIME + 100,
  )
  const read = () =>
    fixture.db
      .prepare('SELECT running_since FROM workspaces WHERE id = ?')
      .bind('run')
      .first('running_since')
  return { ...fixture, lifecycle, read }
}

it('keeps the create time through activity states and replaces it on resume', async () => {
  const { db, lifecycle, read } = await runningFixture()
  for (const state of [
    'starting',
    'ready',
    'working',
    'unread',
    'input',
  ] as const) {
    await persistLifecycleState(
      db,
      { ...lifecycle, state, lastActivityAt: TEST_TIME + 500 },
      TEST_TIME + 500,
    )
    expect(await read(), state).toBe(TEST_TIME + 100)
  }
  const resumed = beginningLifecycleStart(
    { ...lifecycle, state: 'stopped' },
    'resume',
    TEST_TIME + 1_000,
  )
  await persistLifecycleState(db, resumed, TEST_TIME + 1_500)
  expect(await read()).toBe(TEST_TIME + 1_000)
})

it('clears the run time for stopped, error, and archived lifecycle states', async () => {
  const { db, lifecycle, read } = await runningFixture()
  for (const state of ['stopped', 'error', 'archived'] as const) {
    await db
      .prepare(
        "UPDATE workspaces SET state = 'ready', running_since = ? WHERE id = ?",
      )
      .bind(TEST_TIME + 100, 'run')
      .run()
    await persistLifecycleState(db, { ...lifecycle, state }, TEST_TIME + 500)
    expect(await read(), state).toBeNull()
  }
})

it('leaves no run time when the lifecycle has no start', async () => {
  const { db, lifecycle, read } = await runningFixture()
  const withoutStart = {
    workspaceId: lifecycle.workspaceId,
    orgId: lifecycle.orgId,
    state: lifecycle.state,
    lastActivityAt: lifecycle.lastActivityAt,
    stoppedAt: null,
    nextDiskKeepaliveAt: null,
    error: null,
  }
  for (const input of [withoutStart, { ...lifecycle, start: null }]) {
    await db
      .prepare('UPDATE workspaces SET running_since = ? WHERE id = ?')
      .bind(TEST_TIME, 'run')
      .run()
    await persistLifecycleState(db, input, TEST_TIME + 500)
    expect(await read()).toBeNull()
  }
})
