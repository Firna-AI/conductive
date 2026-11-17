import { afterEach, beforeAll, expect, it } from 'vitest'
import {
  SECRET_TOOL_PATHS,
  secretAnswerPath,
} from '../../src/shared/secret-requests'
import { workspaceCapabilitiesPath } from '../../src/shared/secrets'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
  OTHER_TOKEN,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
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

it('lists metadata without values and returns only grants available to the calling session', async () => {
  const active = (f = await secretFixture(bundle))
  await active.seed('GLOBAL', 'global-value', true)
  const pre = await active.seed('PRE', 'pre-value')
  const legacy = await active.seed('SESSION', 'session-value')
  await active.env.DB.prepare('UPDATE org_secrets SET name = ? WHERE id = ?')
    .bind('Cloudflare (read-only)', legacy.id)
    .run()
  await active.request(workspaceCapabilitiesPath(OUTER_ORG, OUTER_WORKSPACE), {
    method: 'PATCH',
    body: JSON.stringify({ preapprovedSecretIds: [pre.id] }),
  })
  const pending = await active.waiting({
    names: ['Cloudflare (read-only)'],
    command: 'deploy',
  })
  expect(
    await active.env.DB.prepare('SELECT state FROM workspaces WHERE id = ?')
      .bind(OUTER_WORKSPACE)
      .first('state'),
  ).toBe('input')
  await active.answer(pending.request.id, { kind: 'allow' })
  expect(await (await pending.response).json()).toEqual({
    status: 'allowed',
    values: { 'Cloudflare (read-only)': 'session-value' },
    grants: [{ name: 'Cloudflare (read-only)', grant: 'session' }],
  })
  const list = await (await active.machine(SECRET_TOOL_PATHS.list)).json()
  expect(list).toEqual({
    secrets: [
      {
        name: 'Cloudflare (read-only)',
        description: 'Use SESSION',
        available: true,
      },
      { name: 'GLOBAL', description: 'Use GLOBAL', available: true },
      { name: 'PRE', description: 'Use PRE', available: true },
    ],
  })
  const withoutTurn = await (
    await active.machine(SECRET_TOOL_PATHS.list, undefined, null)
  ).json()
  expect(withoutTurn).toEqual({
    secrets: [
      {
        name: 'Cloudflare (read-only)',
        description: 'Use SESSION',
        available: false,
      },
      { name: 'GLOBAL', description: 'Use GLOBAL', available: true },
      { name: 'PRE', description: 'Use PRE', available: true },
    ],
  })
  const allowed = await active.run({
    names: ['GLOBAL', 'PRE'],
    command: 'deploy',
  })
  expect(await allowed.json()).toEqual({
    status: 'allowed',
    values: { GLOBAL: 'global-value', PRE: 'pre-value' },
    grants: [
      { name: 'GLOBAL', grant: 'all-agents' },
      { name: 'PRE', grant: 'workspace' },
    ],
  })
  expect(
    await active.env.DB.prepare('SELECT state FROM workspaces WHERE id = ?')
      .bind(OUTER_WORKSPACE)
      .first('state'),
  ).toBe('working')
  expect(JSON.stringify(await active.listRequests())).not.toContain(
    'session-value',
  )
})

it('uses a temporary value in list availability only for a running calling turn', async () => {
  const active = (f = await secretFixture(bundle))
  const temporary = await active.waiting({
    names: ['LATER'],
    command: 'deploy',
  })
  await active.answer(temporary.request.id, {
    kind: 'values',
    lifetime: 'workspace',
    values: { LATER: 'temporary-value' },
  })
  expect((await temporary.response).status).toBe(200)
  await active.seed('LATER', 'stored-later-value')
  expect(
    await (
      await active.machine(SECRET_TOOL_PATHS.list, undefined, null)
    ).json(),
  ).toMatchObject({
    secrets: expect.arrayContaining([
      { name: 'LATER', description: 'Use LATER', available: false },
    ]),
  })
  expect(
    await (await active.machine(SECRET_TOOL_PATHS.list)).json(),
  ).toMatchObject({
    secrets: expect.arrayContaining([
      { name: 'LATER', description: 'Use LATER', available: true },
    ]),
  })
})

it('allows any session member to deny once and never returns a value', async () => {
  const active = (f = await secretFixture(bundle))
  await active.seed('TOKEN', 'deny-value')
  const pending = await active.waiting({
    names: ['TOKEN'],
    command: 'deploy',
    reason: 'Publish the app',
  })
  const denied = await active.answer(pending.request.id, { kind: 'deny' })
  expect(denied.request).toMatchObject({
    state: 'denied',
    answeredBy: { id: 'member' },
  })
  expect(await (await pending.response).json()).toEqual({
    status: 'denied',
    requestId: pending.request.id,
    message: 'member denied the request. The command did not run.',
  })
  const repeated = await active.answer(
    pending.request.id,
    { kind: 'allow' },
    active.cookies.ownerCookie,
  )
  expect(repeated.request.state).toBe('denied')
  expect(
    await active.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM session_secret_approvals',
    ).first('count'),
  ).toBe(0)
})

it('keeps the answer behind sign-in, Origin and org membership rather than a workspace token', async () => {
  const active = (f = await secretFixture(bundle))
  const pending = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  const path = secretAnswerPath(OUTER_ORG, OUTER_WORKSPACE, pending.request.id)
  const bearerOnly = await active.request(path, {
    method: 'POST',
    headers: { Cookie: '', Authorization: 'Bearer outer-workspace-token' },
    body: JSON.stringify({ kind: 'deny' }),
  })
  expect(bearerOnly.status).toBe(401)
  const outsider = await active.request(path, {
    method: 'POST',
    headers: { Cookie: active.cookies.outsiderCookie },
    body: JSON.stringify({ kind: 'deny' }),
  })
  expect(outsider.status).toBe(404)
  const origin = await active.request(path, {
    method: 'POST',
    headers: { Origin: 'https://outside.test' },
    body: JSON.stringify({ kind: 'deny' }),
  })
  expect(origin.status).toBe(403)
  const crossWorkspace = await active.machine(
    SECRET_TOOL_PATHS.run,
    { names: ['TOKEN'], command: 'deploy' },
    'first-turn',
    OTHER_TOKEN,
  )
  expect(crossWorkspace.status).toBe(403)
  const invalid = await active.machine(
    SECRET_TOOL_PATHS.list,
    undefined,
    null,
    'invalid',
  )
  expect(invalid.status).toBe(401)
  await active.answer(pending.request.id, { kind: 'deny' })
  expect((await pending.response).status).toBe(200)
})
