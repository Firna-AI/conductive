import { expect, it } from 'vitest'

import { API_PATHS, type User } from '../../src/shared/api'
import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { createWorkspace } from './workspaces'

const fixtureForTest = setupBackendTests()

async function outsider(fixture: ReturnType<typeof fixtureForTest>) {
  fixture.harness.github.profile = { id: 9, login: 'outside-person' }
  const session = await fixture.harness.login()
  const current = await fixture.harness.request(API_PATHS.session, session)
  const { user }: { user: User } = await current.json()
  return user
}

async function attempts(fixture: ReturnType<typeof fixtureForTest>) {
  return fixture.runtime.env.DB.prepare(
    'SELECT COUNT(*) AS count FROM workspace_creation_attempts',
  ).first('count')
}

it('refuses a create when the owner or the sender is outside the org', async () => {
  const fixture = fixtureForTest()
  const stranger = await outsider(fixture)
  const input = {
    repositoryId: fixture.repositoryId,
    firstMessage: FIRST_MESSAGE,
  }
  const { runtime, org, user } = fixture
  await expect(
    fixture.run(() => createWorkspace(runtime, org.id, stranger, input)),
  ).rejects.toMatchObject({ status: 404, code: 'org_not_found' })
  await expect(
    fixture.run(() => createWorkspace(runtime, org.id, user, input, stranger)),
  ).rejects.toMatchObject({ status: 404, code: 'org_not_found' })
  expect(await attempts(fixture)).toBe(0)
})

it('names a suspended org before a missing membership', async () => {
  const fixture = fixtureForTest()
  const stranger = await outsider(fixture)
  await fixture.runtime.env.DB.prepare(
    'UPDATE orgs SET suspended_at = 1 WHERE id = ?',
  )
    .bind(fixture.org.id)
    .run()
  await expect(
    createWorkspace(fixture.runtime, fixture.org.id, stranger, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  ).rejects.toMatchObject({ status: 403, code: 'org_suspended' })
  expect(await attempts(fixture)).toBe(0)
})
