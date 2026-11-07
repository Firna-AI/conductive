import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { createHarness, type TestHarness } from '../test-support/harness'
import { toolFixture, TOOL_TEST_ORIGIN, type ToolFixture } from './test-support'

let harness: TestHarness
let fixture: ToolFixture

beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  fixture = await toolFixture(harness)
})
afterAll(async () => {
  await harness.dispose()
})

it('lists every workspace of the authenticated org, including other owners and archives', async () => {
  await fixture.db
    .prepare(
      "UPDATE workspaces SET state = 'input' WHERE id = 'teammate-workspace'",
    )
    .run()
  const response = await fixture.request(
    {},
    `${TOOL_TEST_ORIGIN}${MACHINE_PATHS.workspaces}?orgId=org-b`,
  )

  expect(response.status).toBe(200)
  const expected = {
    workspaces: [
      {
        id: 'calling-workspace',
        name: 'Lisbon',
        branch: 'owner-login/lisbon-ab12',
        state: 'working',
      },
      {
        id: 'teammate-workspace',
        name: 'Paris',
        branch: 'teammate-login/paris-cd34',
        state: 'input',
      },
      {
        id: 'archived-workspace',
        name: 'Rome',
        branch: 'owner-login/rome-ef56',
        state: 'archived',
      },
    ],
  }
  expect(await response.json()).toEqual(expected)
  await expect(fixture.client.list()).resolves.toEqual(expected)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(fixture.services.callingTurn).not.toHaveBeenCalled()
})

it('denies missing, invalid, revoked, archived, and deleted-org workspace credentials', async () => {
  const expected = {
    error: {
      code: 'workspace_token_invalid',
      message: 'The workspace login is not valid. Start the workspace again.',
    },
  }
  for (const authorization of [
    '',
    'Bearer unknown-token',
    'Basic browser-session',
  ]) {
    const response = await fixture.request({
      headers: {
        Authorization: authorization,
        Cookie: 'session=browser-session',
      },
    })
    expect(response.status, authorization).toBe(401)
    expect(await response.json(), authorization).toEqual(expected)
  }
  for (const update of [
    'UPDATE workspace_tokens SET revoked_at = 1',
    "UPDATE workspaces SET archived_at = 1 WHERE id = 'calling-workspace'",
    "UPDATE workspaces SET state = 'archived' WHERE id = 'calling-workspace'",
    "UPDATE orgs SET deleted_at = 1 WHERE id = 'org-a'",
  ]) {
    await fixture.db.prepare(update).run()
    const response = await fixture.request()
    expect(response.status, update).toBe(401)
    expect(await response.json(), update).toEqual(expected)
    await fixture.db.batch([
      fixture.db.prepare('UPDATE workspace_tokens SET revoked_at = NULL'),
      fixture.db.prepare(
        "UPDATE workspaces SET archived_at = NULL, state = 'working' WHERE id = 'calling-workspace'",
      ),
      fixture.db.prepare('UPDATE orgs SET deleted_at = NULL'),
    ])
  }
})

it('grants the workspace token no other host, route, method, or socket', async () => {
  for (const path of [
    '/api/orgs',
    '/tools/workspaces',
    MACHINE_PATHS.runner,
    MACHINE_PATHS.gitCredential,
    MACHINE_PATHS.githubWebhook,
  ]) {
    const response = await fixture.request({}, `${TOOL_TEST_ORIGIN}${path}`)
    expect(response.status, path).toBe(404)
  }
  const otherHost = await fixture.request(
    {},
    `https://app.conductive.test${MACHINE_PATHS.workspaces}`,
  )
  expect(otherHost.status).toBe(404)
  for (const init of [
    { method: 'DELETE' },
    { headers: { Upgrade: 'websocket' } },
  ]) {
    const response = await fixture.request(init)
    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('GET, POST')
  }
  expect(fixture.services.createWorkspace).not.toHaveBeenCalled()
})

it('rejects invalid create payloads before the lifecycle starts', async () => {
  for (const body of [
    null,
    {},
    { repositoryId: 'repo-a', firstMessage: '  ' },
    {
      repositoryId: 'repo-a',
      firstMessage: 'Task',
      model: { agent: 'other', model: 'opaque-model' },
    },
    { repositoryId: 'repo-a', firstMessage: 'Task', effort: 'unbounded' },
  ]) {
    const response = await fixture.create(body)
    expect(response.status, JSON.stringify(body)).toBe(400)
  }
  const malformed = await fixture.request({ method: 'POST', body: '{' })
  expect(malformed.status).toBe(400)
  const text = await fixture.request({
    method: 'POST',
    body: '{}',
    headers: { 'Content-Type': 'text/plain' },
  })
  expect(text.status).toBe(415)
  expect(fixture.services.createWorkspace).not.toHaveBeenCalled()
})
