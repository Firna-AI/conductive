import { expect, it } from 'vitest'

import { FakeE2b } from '../test-support/fake-e2b'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { archiveFixture } from './archive-test-support'
import { ARCHIVE_STATE_KEY } from './archive-types'
import { readWorkspace } from './workspace-data'

const fixtureForTest = setupBackendTests()
const day = 86_400_000

it('keeps an archived E2B disk stopped until its expiry and deletes it through its saved account', async () => {
  const fixture = fixtureForTest()
  const { runtime } = fixture
  const server = new FakeE2b()
  runtime.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    e2b: {
      kind: 'e2b',
      apiKey: server.apiKey,
      domain: server.domain,
      templateId: 'e2b-template',
    },
  })
  const fetch = runtime.dependencies.fetch
  runtime.dependencies.fetch = (request) =>
    new URL(request.url).hostname.endsWith(server.domain)
      ? server.fetch(request)
      : fetch(request)
  const saved = await archiveFixture(fixture, true)
  server.sandboxes.set('sandbox-one', {
    sandboxID: 'sandbox-one',
    state: 'paused',
    pauseMode: 'filesystem',
    metadata: {},
  })
  await runtime.env.DB.prepare(
    'UPDATE workspaces SET provider_account = ?, sandbox_id = ? WHERE id = ?',
  )
    .bind('e2b', 'sandbox-one', saved.id)
    .run()
  await fixture.setTime(TEST_TIME + day)
  const archived = await saved.archive()
  expect(archived.workspace.restoreUntil).toBe(TEST_TIME + 15 * day)
  expect(await saved.actor.storage.get('alarm:lifecycle:archive')).toBe(
    TEST_TIME + 15 * day,
  )
  await fixture.advanceTo(TEST_TIME + 13 * day, saved.id)
  expect(
    server.requests.filter((request) =>
      new URL(request.url).pathname.endsWith('/connect'),
    ),
  ).toEqual([])
  expect(await saved.actor.storage.get(ARCHIVE_STATE_KEY)).toMatchObject({
    phase: 'retained',
    providerAccount: 'e2b',
  })
  expect(server.sandboxes.get('sandbox-one')?.state).toBe('paused')
  await fixture.advanceTo(TEST_TIME + 15 * day, saved.id)
  expect(
    server.requests.map(
      (request) => `${request.method} ${new URL(request.url).pathname}`,
    ),
  ).toEqual(['GET /sandboxes/sandbox-one', 'DELETE /sandboxes/sandbox-one'])
  expect(server.sandboxes.has('sandbox-one')).toBe(false)
  expect(
    server.requests
      .filter((request) => request.method === 'DELETE')
      .map((request) => new URL(request.url).pathname),
  ).toEqual(['/sandboxes/sandbox-one'])
  expect(
    await readWorkspace(runtime.env.DB, fixture.org.id, saved.id),
  ).toMatchObject({
    sandboxId: null,
    providerAccount: 'e2b',
    state: 'archived',
  })
})
