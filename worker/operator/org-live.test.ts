import { afterEach, beforeAll, expect, it } from 'vitest'

import { API_PATHS, orgPath } from '../../src/shared/api'
import { chatHistoryPath } from '../../src/shared/events'
import { leaveOrgPath } from '../../src/shared/orgs'
import {
  sessionPath,
  sessionPaths,
  sessionsPath,
} from '../../src/shared/sessions'
import { workspaceViewPath } from '../../src/shared/workspace-view'
import { workspacePaths, workspacesPath } from '../../src/shared/workspaces'
import { CLAUDE } from '../chat/harness.test-support'
import { record, string } from '../chat/inputs'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('keeps real app suspension metadata and chat reads while only eligible Leave remains writable', async () => {
  fixture = await createOuterRuntime(bundle)
  const created = await fixture.request(
    sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: JSON.stringify({ choice: CLAUDE }) },
  )
  expect(created.status).toBe(201)
  const sessionId = string(record(record(await created.json()).session).id)
  const historyPath = chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, sessionId)
  const before = await (await fixture.request(historyPath)).json()
  await fixture.env.DB.prepare(
    'UPDATE orgs SET suspended_at = 1234 WHERE id = ?',
  )
    .bind(OUTER_ORG)
    .run()
  expect(await (await fixture.request(orgPath(OUTER_ORG))).json()).toEqual({
    org: {
      id: OUTER_ORG,
      name: 'Chat org',
      role: 'admin',
      suspension: { suspendedAt: 1234 },
    },
  })
  expect(await (await fixture.request(API_PATHS.orgs)).json()).toEqual({
    orgs: [
      {
        id: OUTER_ORG,
        name: 'Chat org',
        role: 'admin',
        suspension: { suspendedAt: 1234 },
      },
    ],
  })
  for (const [path, method, body] of [
    [sessionsPath(OUTER_ORG, OUTER_WORKSPACE), 'POST', '{'],
    [sessionPath(OUTER_ORG, OUTER_WORKSPACE, sessionId), 'PATCH', '{}'],
    [
      sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, sessionId),
      'POST',
      '{}',
    ],
    [workspaceViewPath(OUTER_ORG, OUTER_WORKSPACE), 'PUT', '{}'],
    [workspacePaths.read(OUTER_ORG, OUTER_WORKSPACE), 'PUT', '{}'],
    [workspacePaths.resume(OUTER_ORG, OUTER_WORKSPACE), 'POST', '{}'],
    [workspacesPath(OUTER_ORG), 'POST', '{}'],
  ] as const) {
    const response = await fixture.request(path, { method, body })
    expect([path, response.status]).toEqual([path, 403])
    expect(await response.json()).toMatchObject({
      error: { code: 'org_suspended' },
    })
  }
  const readable = await fixture.request(historyPath)
  expect(readable.status).toBe(200)
  expect(await readable.json()).toEqual(before)
  expect((await fixture.request(API_PATHS.session)).status).toBe(200)
  expect(
    (
      await fixture.request(orgPath('other-org'), {
        headers: { Cookie: fixture.cookies.outsiderCookie },
      })
    ).status,
  ).toBe(200)
  const adminLeave = await fixture.request(leaveOrgPath(OUTER_ORG), {
    method: 'POST',
    body: '{}',
  })
  expect(adminLeave.status).toBe(409)
  expect(await adminLeave.json()).toMatchObject({
    error: { code: 'last_admin' },
  })
  const member = fixture.cookies.memberCookie
  expect(
    (
      await fixture.request(leaveOrgPath(OUTER_ORG), {
        method: 'POST',
        body: '{}',
        headers: { Cookie: member },
      })
    ).status,
  ).toBe(204)
  expect(
    (await fixture.request(API_PATHS.session, { headers: { Cookie: member } }))
      .status,
  ).toBe(200)
  expect(
    await fixture.env.DB.prepare(
      "SELECT COUNT(*) AS n FROM org_members WHERE org_id = ? AND user_id = 'member'",
    )
      .bind(OUTER_ORG)
      .first('n'),
  ).toBe(0)
  expect(fixture.boat.starts).toEqual([])
})
