import { afterEach, beforeAll, expect, it } from 'vitest'
import { chatHistoryPath } from '../../src/shared/events'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { record } from '../chat/inputs'
import { array } from '../chat/agent-events'
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

/** A request that became late, and a second request that waits. */
async function lateThenWaiting(active: SecretFixture, first: string[]) {
  const late = await active.waiting({ names: first, command: 'deploy' })
  await (
    await active.secretActor()
  ).advanceSecretClock(DEVICE_TEST_NOW + 90_000)
  expect(await (await late.response).json()).toMatchObject({
    status: 'pending',
  })
  const waiting = await active.waiting({
    names: ['TOKEN'],
    command: 'deploy again',
  })
  return { late, waiting }
}

async function requestState(active: SecretFixture, id: string) {
  const found = (await active.listRequests()).requests.find(
    (request) => request.id === id,
  )
  if (!found) throw new Error(`The request ${id} is missing.`)
  return found
}

async function notices(active: SecretFixture) {
  const history = record(
    await (
      await active.request(
        chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, 'first-session'),
      )
    ).json(),
  )
  return array(history.events, (item) => record(record(item).event)).filter(
    (event) => event.type === 'secrets.notice',
  )
}

async function workspaceState(active: SecretFixture) {
  return active.env.DB.prepare('SELECT state FROM workspaces WHERE id = ?')
    .bind(OUTER_WORKSPACE)
    .first('state')
}

it('allows the late request too when a member allows the waiting one', async () => {
  const active = (f = await secretFixture(bundle))
  await active.seed('TOKEN', 'covered-value')
  const { late, waiting } = await lateThenWaiting(active, ['TOKEN'])
  expect(waiting.request.id).not.toBe(late.request.id)
  await active.answer(waiting.request.id, { kind: 'allow' })
  expect(await (await waiting.response).json()).toMatchObject({
    status: 'allowed',
    values: { TOKEN: 'covered-value' },
  })
  expect(await requestState(active, late.request.id)).toMatchObject({
    state: 'allowed',
    late: true,
    answeredBy: { id: 'member' },
    lifetime: null,
    notice: null,
  })
  expect(await notices(active)).toEqual([])
  expect(await workspaceState(active)).not.toBe('input')
})

it('gives the values to the waiting call and sends no notice when a member allows the late request', async () => {
  const active = (f = await secretFixture(bundle))
  await active.seed('TOKEN', 'covered-value')
  const { late, waiting } = await lateThenWaiting(active, ['TOKEN'])
  const answered = await active.answer(late.request.id, { kind: 'allow' })
  expect(answered.request).toMatchObject({ state: 'allowed', notice: null })
  expect(await (await waiting.response).json()).toMatchObject({
    status: 'allowed',
    values: { TOKEN: 'covered-value' },
  })
  expect(await requestState(active, waiting.request.id)).toMatchObject({
    state: 'allowed',
    late: false,
    answeredBy: { id: 'member' },
  })
  expect(await notices(active)).toEqual([])
})

it('sends one notice when one answer allows two late requests of a session', async () => {
  const active = (f = await secretFixture(bundle))
  await active.seed('TOKEN', 'covered-value')
  const { late, waiting } = await lateThenWaiting(active, ['TOKEN'])
  await active.finish()
  expect(await (await waiting.response).json()).toMatchObject({
    status: 'pending',
  })
  const answered = await active.answer(late.request.id, { kind: 'allow' })
  expect(answered.request.notice).toMatchObject({ state: 'sent' })
  expect(await requestState(active, waiting.request.id)).toMatchObject({
    state: 'allowed',
    late: true,
    notice: null,
  })
  expect(await notices(active)).toEqual([
    expect.objectContaining({ requestId: late.request.id }),
  ])
})

it('keeps a request open while one of its secrets has no grant', async () => {
  const active = (f = await secretFixture(bundle))
  await active.seed('TOKEN', 'covered-value')
  await active.seed('OTHER', 'other-value')
  const { late, waiting } = await lateThenWaiting(active, ['TOKEN', 'OTHER'])
  await active.answer(waiting.request.id, { kind: 'allow' })
  expect((await requestState(active, late.request.id)).state).toBe('late')
  expect(await workspaceState(active)).toBe('input')
})

it('ends only the denied request', async () => {
  const active = (f = await secretFixture(bundle))
  await active.seed('TOKEN', 'covered-value')
  const { late, waiting } = await lateThenWaiting(active, ['TOKEN'])
  await active.answer(waiting.request.id, { kind: 'deny' })
  expect((await requestState(active, late.request.id)).state).toBe('late')
})

it('follows the scope of the grant across sessions', async () => {
  const active = (f = await secretFixture(bundle))
  const other = await active.newSession()
  const sent = await active.send(other.id, 'other-message')
  if (!sent.session.activeTurnId) throw new Error('The new turn is missing.')
  const elsewhere = await active.waiting(
    { names: ['TOKEN'], command: 'deploy elsewhere' },
    sent.session.activeTurnId,
  )
  const here = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  await active.answer(here.request.id, {
    kind: 'values',
    lifetime: '15-minutes',
    values: { TOKEN: 'session-value' },
  })
  expect((await requestState(active, elsewhere.request.id)).state).toBe(
    'waiting',
  )
  const next = await active.waiting(
    { names: ['NEXT'], command: 'next elsewhere' },
    sent.session.activeTurnId,
  )
  const nextHere = await active.waiting({ names: ['NEXT'], command: 'next' })
  await active.answer(nextHere.request.id, {
    kind: 'values',
    lifetime: 'workspace',
    values: { NEXT: 'next-value' },
  })
  expect(await (await next.response).json()).toMatchObject({
    status: 'allowed',
    values: { NEXT: 'next-value' },
  })
  expect(await requestState(active, next.request.id)).toMatchObject({
    state: 'allowed',
    lifetime: 'workspace',
  })
  await active.answer(elsewhere.request.id, { kind: 'deny' })
})
