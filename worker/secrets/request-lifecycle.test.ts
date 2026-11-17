import { afterEach, beforeAll, expect, it } from 'vitest'
import { sessionPaths } from '../../src/shared/sessions'
import { workspacePaths } from '../../src/shared/workspaces'
import { secretAnswerPath } from '../../src/shared/secret-requests'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { record } from '../chat/inputs'
import { secretFixture, type SecretFixture } from './requests.test-support'

let bundle: string
let f: SecretFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/secrets/requests-entry.test-support.ts',
  )
})
afterEach(async () => {
  await f?.dispose()
  f = undefined
})

it('ends open requests and erases workspace values at Archive', async () => {
  const active = (f = await secretFixture(bundle))
  const supplied = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  await active.answer(supplied.request.id, {
    kind: 'values',
    lifetime: 'workspace',
    values: { TOKEN: 'archive-private-value' },
  })
  expect((await supplied.response).status).toBe(200)
  const pending = await active.waiting({ names: ['OTHER'], command: 'deploy' })
  const archived = await active.request(
    workspacePaths.archive(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: '{}' },
  )
  expect(archived.status).toBe(200)
  expect(await (await pending.response).json()).toMatchObject({
    status: 'not-answered',
  })
  const snapshot = await active.listRequests()
  expect(
    snapshot.requests.find((item) => item.id === pending.request.id),
  ).toMatchObject({ state: 'not-answered', endedBy: 'archived' })
  expect(snapshot.workspaceValues).toEqual([])
  expect(
    await active.env.DB.prepare('SELECT state FROM workspaces WHERE id = ?')
      .bind(OUTER_WORKSPACE)
      .first('state'),
  ).toBe('archived')
})

it('ends a late request on session close and clears needs input', async () => {
  const active = (f = await secretFixture(bundle))
  const pending = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  await active.finish()
  await active.listRequests()
  expect(await (await pending.response).json()).toMatchObject({
    status: 'pending',
  })
  const tab = await active.browser()
  const closed = await active.request(
    sessionPaths.close(OUTER_ORG, OUTER_WORKSPACE, 'first-session'),
    { method: 'POST', body: JSON.stringify({ stopRunningTurn: false }) },
  )
  expect(closed.status).toBe(200)
  for (;;) {
    const message = record(await tab.inbox.next())
    if (message.type !== 'event') continue
    const event = record(record(message.envelope).event)
    if (event.type === 'secrets.request.updated') {
      expect(event.request).toMatchObject({
        state: 'not-answered',
        endedBy: 'session-closed',
      })
      break
    }
  }
  expect((await active.listRequests()).requests[0]).toMatchObject({
    state: 'not-answered',
    endedBy: 'session-closed',
  })
  const answer = await active.request(
    secretAnswerPath(OUTER_ORG, OUTER_WORKSPACE, pending.request.id),
    { method: 'POST', body: JSON.stringify({ kind: 'deny' }) },
  )
  expect(answer.status).toBe(409)
  expect(
    await active.env.DB.prepare('SELECT state FROM workspaces WHERE id = ?')
      .bind(OUTER_WORKSPACE)
      .first('state'),
  ).toBe('ready')
})

it.each([
  {
    reason: 'org-suspended',
    sql: 'UPDATE orgs SET suspended_at = 1 WHERE id = ?',
    id: OUTER_ORG,
  },
  {
    reason: 'owner-suspended',
    sql: 'UPDATE users SET suspended_at = 1 WHERE id = ?',
    id: 'owner',
  },
])(
  'ends open requests as Not answered when $reason',
  async ({ reason, sql, id }) => {
    const active = (f = await secretFixture(bundle))
    const pending = await active.waiting({
      names: ['TOKEN'],
      command: 'deploy',
    })
    await active.env.DB.prepare(sql).bind(id).run()
    await (await active.secretActor()).advanceSecretClock(DEVICE_TEST_NOW)
    const snapshot = await active.listRequests(active.cookies.memberCookie)
    expect(snapshot.requests[0]).toMatchObject({
      state: 'not-answered',
      endedBy: reason,
    })
    expect(await (await pending.response).json()).toMatchObject({
      status: 'not-answered',
    })
    expect(
      await active.env.DB.prepare('SELECT state FROM workspaces WHERE id = ?')
        .bind(OUTER_WORKSPACE)
        .first('state'),
    ).toBe('working')
  },
)
