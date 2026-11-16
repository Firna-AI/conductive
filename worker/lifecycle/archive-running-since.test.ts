import { expect, it } from 'vitest'

import { markWorkspaceArchived } from '../app-api/archive-data'
import { TEST_TIME } from '../test-support/harness'
import { readArchiveResource, restoreArchiveRecord } from './archive-data'
import { seededCompletedWorkspace } from './backend-workspace.test-support'
import { setupBackendTests } from './backend-test-hooks'

const fixtureForTest = setupBackendTests()

it('projects the native start time and clears it when a running workspace is archived', async () => {
  const fixture = fixtureForTest()
  const { id } = await seededCompletedWorkspace(fixture)
  const { env } = fixture.runtime
  const read = () =>
    env.DB.prepare('SELECT running_since FROM workspaces WHERE id = ?')
      .bind(id)
      .first('running_since')
  expect(await read()).toBe(TEST_TIME)
  await markWorkspaceArchived(
    env,
    fixture.org.id,
    id,
    fixture.user.id,
    TEST_TIME + 100,
  )
  expect(await read()).toBeNull()
})

it('clears a retained run time when an archive is restored to stopped', async () => {
  const fixture = fixtureForTest()
  const { id } = await seededCompletedWorkspace(fixture)
  const { env } = fixture.runtime
  await markWorkspaceArchived(
    env,
    fixture.org.id,
    id,
    fixture.user.id,
    TEST_TIME,
  )
  await env.DB.prepare('UPDATE workspaces SET running_since = ? WHERE id = ?')
    .bind(TEST_TIME, id)
    .run()
  const archived = await readArchiveResource(env.DB, id)
  if (!archived) throw new Error('Missing archived workspace')
  expect(
    await restoreArchiveRecord(
      env.DB,
      archived,
      fixture.user.id,
      TEST_TIME + 100,
    ),
  ).toBe(true)
  expect(
    await env.DB.prepare(
      'SELECT state, running_since AS runningSince FROM workspaces WHERE id = ?',
    )
      .bind(id)
      .first(),
  ).toEqual({ state: 'stopped', runningSince: null })
})
