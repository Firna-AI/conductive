import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { orgPath } from '../../src/shared/api'
import { filePaths } from '../../src/shared/files'
import { setupFilesHttp } from '../files/test-support/http'
import {
  createFilesStorage,
  type FilesStorageHarness,
} from '../files/test-support/storage'
import { createHarness, type TestHarness } from '../test-support/harness'

let harness: TestHarness
let storage: FilesStorageHarness
beforeAll(async () => {
  harness = await createHarness()
  storage = await createFilesStorage()
  harness.env.BOAT_API_KEY = 'app-owned-key'
  harness.env.BOAT_ORG_ID = 'app-owned-org'
  harness.boat.apiKey = 'app-owned-key'
  harness.boat.orgId = 'app-owned-org'
  await harness.env.DB.prepare('DROP TABLE boat_keys').run()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await storage.dispose()
  await harness.dispose()
})

it('makes the removed org key routes unavailable without reaching the provider', async () => {
  const session = await harness.login()
  const org = await harness.createOrg(session)
  const path = `${orgPath(org.id)}/boat-key`
  for (const method of ['GET', 'PUT']) {
    const response = await harness.request(path, session, {
      method,
      body: method === 'PUT' ? '{"key":"untrusted-key"}' : undefined,
    })
    expect(response.status, method).toBe(404)
    expect(await response.json()).toEqual({
      error: { code: 'not_found', message: 'The page is not available.' },
    })
  }
  expect(harness.boat.requests).toHaveLength(0)
})

it('uses the app secret for separate orgs without a key store and keeps their files isolated', async () => {
  const { org, session, workspaceId, handler, request } = await setupFilesHttp(
    harness,
    storage,
  )
  harness.github.profile = { id: 8, login: 'other-user' }
  const otherSession = await harness.login()
  const otherOrg = await harness.createOrg(otherSession)
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      `INSERT INTO repositories
       (id, org_id, github_repository_id, full_name, default_branch)
       VALUES ('other-repository', ?, 2, 'other/repository', 'main')`,
    ).bind(otherOrg.id),
    harness.env.DB.prepare(
      `INSERT INTO workspaces
       (id, org_id, repository_id, owner_user_id, name, branch, sandbox_id, state, created_at, updated_at)
       SELECT 'other-workspace', id, 'other-repository', creator_user_id,
       'Other', 'other/task', 'bx_two', 'stopped', 0, 0 FROM orgs WHERE id = ?`,
    ).bind(otherOrg.id),
  ])
  harness.boat.responseOverride = Response.json({
    ok: true,
    type: 'file.read',
    success: true,
    path: '/home/user/repos/storefront/note.txt',
    encoding: 'base64',
    size: 3,
    content: 'aGkK',
  })
  const first = await request(
    filePaths.content(org.id, workspaceId, 'note.txt'),
  )
  const second = await handler(
    new Request(
      `${harness.env.APP_ORIGIN}${filePaths.content(otherOrg.id, 'other-workspace', 'note.txt')}`,
      { headers: { Cookie: otherSession } },
    ),
    harness.env,
  )
  for (const response of [first, second]) {
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      path: 'note.txt',
      mediaType: 'text/plain',
      sizeBytes: 3,
      encoding: 'utf-8',
      content: 'hi\n',
    })
  }
  expect(
    harness.boat.requests.map((upstream) => new URL(upstream.url).pathname),
  ).toEqual([
    '/api/v1/sandboxes/bx_one/files',
    '/api/v1/sandboxes/bx_two/files',
  ])
  for (const upstream of harness.boat.requests) {
    expect(upstream.headers.get('Authorization')).toBe('Bearer app-owned-key')
    expect(upstream.headers.get('X-Boat-Org')).toBe('app-owned-org')
    expect(upstream.headers.get('Cookie')).toBe(null)
  }
  for (const path of [
    filePaths.content(otherOrg.id, 'other-workspace', 'note.txt'),
    filePaths.content(org.id, 'other-workspace', 'note.txt'),
  ]) {
    const response = await handler(
      new Request(`${harness.env.APP_ORIGIN}${path}`, {
        headers: { Cookie: session },
      }),
      harness.env,
    )
    expect(response.status, path).toBe(404)
  }
  expect(harness.boat.requests).toHaveLength(2)
})
