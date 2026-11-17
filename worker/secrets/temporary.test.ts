import { array } from '../chat/agent-events'
import { record, string } from '../chat/inputs'
import { afterEach, beforeAll, expect, it } from 'vitest'
import { secretPath, secretsPath } from '../../src/shared/secrets'
import { secretAnswerPath } from '../../src/shared/secret-requests'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
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

it('combines stored approvals and missing values in one request with one 15-minute lifetime', async () => {
  const active = (f = await secretFixture(bundle))
  const stored = await active.seed('STORED', 'stored-value')
  const pending = await active.waiting({
    names: ['STORED', 'FIRST', 'SECOND'],
    command: 'deploy',
    reason: 'Publish the app',
  })
  expect(pending.request.secrets).toEqual([
    { name: 'STORED', secretId: stored.id, description: 'Use STORED' },
    { name: 'FIRST', secretId: null, description: '' },
    { name: 'SECOND', secretId: null, description: '' },
  ])
  await active.answer(pending.request.id, {
    kind: 'values',
    lifetime: '15-minutes',
    values: { FIRST: 'first-value', SECOND: 'second-value' },
  })
  expect(await (await pending.response).json()).toEqual({
    status: 'allowed',
    values: {
      STORED: 'stored-value',
      FIRST: 'first-value',
      SECOND: 'second-value',
    },
    grants: [
      { name: 'STORED', grant: 'session' },
      { name: 'FIRST', grant: '15-minutes' },
      { name: 'SECOND', grant: '15-minutes' },
    ],
  })
  const actor = await active.secretActor()
  expect(await actor.storedSecretState()).not.toContain('first-value')
  expect((await active.listRequests()).workspaceValues).toEqual([])
  const other = await active.newSession()
  const sent = await active.send(other.id, 'other-session-message')
  if (!sent.session.activeTurnId) throw new Error('The other turn is missing.')
  const otherRequest = await active.waiting(
    { names: ['FIRST'], command: 'deploy' },
    sent.session.activeTurnId,
  )
  await active.answer(otherRequest.request.id, { kind: 'deny' })
  expect(await (await otherRequest.response).json()).toMatchObject({
    status: 'denied',
  })
  await actor.advanceSecretClock(DEVICE_TEST_NOW + 899_999)
  expect(
    await (await active.run({ names: ['FIRST'], command: 'deploy' })).json(),
  ).toMatchObject({ status: 'allowed', values: { FIRST: 'first-value' } })
  await actor.advanceSecretClock(DEVICE_TEST_NOW + 900_000)
  const expired = await active.waiting({ names: ['FIRST'], command: 'deploy' })
  expect(expired.request.secrets).toEqual([
    { name: 'FIRST', secretId: null, description: '' },
  ])
  await active.answer(expired.request.id, { kind: 'deny' })
  expect((await expired.response).status).toBe(200)
  expect(
    await active.env.DB.prepare('SELECT COUNT(*) FROM org_secrets').first(
      'COUNT(*)',
    ),
  ).toBe(1)
})

it('keeps a workspace value encrypted and available across sessions', async () => {
  const active = (f = await secretFixture(bundle))
  const pending = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  await active.answer(pending.request.id, {
    kind: 'values',
    lifetime: 'workspace',
    values: { TOKEN: 'private-workspace-token' },
  })
  expect(await (await pending.response).json()).toMatchObject({
    status: 'allowed',
    values: { TOKEN: 'private-workspace-token' },
  })
  const session = await active.newSession()
  const sent = await active.send(session.id, 'workspace-value-message')
  if (!sent.session.activeTurnId) throw new Error('The new turn is missing.')
  expect(
    await (
      await active.run(
        { names: ['TOKEN'], command: 'deploy' },
        sent.session.activeTurnId,
      )
    ).json(),
  ).toEqual({
    status: 'allowed',
    values: { TOKEN: 'private-workspace-token' },
    grants: [{ name: 'TOKEN', grant: 'workspace-value' }],
  })
  const values = (await active.listRequests()).workspaceValues
  expect(values).toEqual([
    {
      id: expect.any(String),
      name: 'TOKEN',
      suppliedBy: {
        id: 'member',
        githubLogin: 'member',
        displayName: null,
        avatarUrl: null,
      },
      createdAt: DEVICE_TEST_NOW,
    },
  ])
  expect(await (await active.secretActor()).storedSecretState()).not.toContain(
    'private-workspace-token',
  )
})

it('requires every missing value before writing any approval', async () => {
  const active = (f = await secretFixture(bundle))
  await active.seed('STORED', 'stored-value')
  const pending = await active.waiting({
    names: ['STORED', 'FIRST', 'SECOND'],
    command: 'deploy',
  })
  for (const values of [
    { FIRST: 'first-value' },
    { FIRST: 'first-value', SECOND: '' },
  ]) {
    const incomplete = await active.request(
      secretAnswerPath(OUTER_ORG, OUTER_WORKSPACE, pending.request.id),
      {
        method: 'POST',
        body: JSON.stringify({
          kind: 'values',
          lifetime: '15-minutes',
          values,
        }),
      },
    )
    expect(incomplete.status).toBe(400)
    expect(
      await active.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM session_secret_approvals',
      ).first('count'),
    ).toBe(0)
    expect((await active.listRequests()).requests[0].state).toBe('waiting')
  }
  await active.answer(pending.request.id, { kind: 'deny' })
  expect((await pending.response).status).toBe(200)
})

it('saves missing names as org secrets owned by the answerer without the all-agents mark', async () => {
  const active = (f = await secretFixture(bundle))
  const pending = await active.waiting({
    names: ['SAVED'],
    command: 'deploy',
    reason: 'Publish the app',
  })
  await active.answer(pending.request.id, {
    kind: 'values',
    lifetime: 'save',
    values: { SAVED: 'saved-value' },
  })
  expect(await (await pending.response).json()).toEqual({
    status: 'allowed',
    values: { SAVED: 'saved-value' },
    grants: [{ name: 'SAVED', grant: 'session' }],
  })
  const listed = record(
    await (await active.request(secretsPath(OUTER_ORG))).json(),
  )
  const secrets = array(listed.secrets, record)
  expect(secrets).toEqual([
    expect.objectContaining({
      name: 'SAVED',
      description: 'Publish the app',
      createdByUserId: 'member',
      allAgents: false,
    }),
  ])
  await active.request(secretPath(OUTER_ORG, string(secrets[0].id)), {
    method: 'DELETE',
    body: '{}',
  })
  await active.seed('SAVED', 'replacement')
  const again = await active.waiting({ names: ['SAVED'], command: 'deploy' })
  await active.answer(again.request.id, { kind: 'deny' })
  expect(await (await again.response).json()).toMatchObject({
    status: 'denied',
  })
})
