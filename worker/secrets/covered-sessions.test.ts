import { afterEach, beforeAll, expect, it } from 'vitest'
import { workspaceCapabilitiesPath } from '../../src/shared/secrets'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { record } from '../chat/inputs'
import { secretFixture, type SecretFixture } from './requests.test-support'
import { notices, requestState } from './covered.test-support'

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

/** A second session with a running turn. */
async function otherTurn(active: SecretFixture) {
  const other = await active.newSession()
  const sent = await active.send(other.id, 'other-message')
  if (!sent.session.activeTurnId) throw new Error('The new turn is missing.')
  return { sessionId: other.id, turnId: sent.session.activeTurnId }
}

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

it('sends the notice of another session on its covered late request', async () => {
  const active = (f = await secretFixture(bundle))
  const other = await otherTurn(active)
  const elsewhere = await active.waiting(
    { names: ['TOKEN'], command: 'deploy elsewhere' },
    other.turnId,
  )
  await (
    await active.secretActor()
  ).advanceSecretClock(DEVICE_TEST_NOW + 90_000)
  expect(await (await elsewhere.response).json()).toMatchObject({
    status: 'pending',
  })
  const here = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  await active.answer(here.request.id, {
    kind: 'values',
    lifetime: 'workspace',
    values: { TOKEN: 'workspace-value' },
  })
  expect(await (await here.response).json()).toMatchObject({
    status: 'allowed',
  })
  const covered = await requestState(active, elsewhere.request.id)
  expect(covered).toMatchObject({
    state: 'allowed',
    lifetime: 'workspace',
    notice: { state: 'sent' },
  })
  if (covered.notice?.state !== 'sent') throw new Error('No notice was sent.')
  expect(
    await (await active.secretActor()).secretTurn(covered.notice.turnId),
  ).toMatchObject({ sessionId: other.sessionId, state: 'running' })
  expect(await notices(active, other.sessionId)).toEqual([
    expect.objectContaining({ requestId: elsewhere.request.id }),
  ])
  expect(await notices(active)).toEqual([])
  for (;;) {
    const command = record(await active.runner.inbox.next())
    if (
      (command.type === 'turn' || command.type === 'message') &&
      record(command.message).text === 'member gave TOKEN for this workspace.'
    )
      break
  }
})

it('leaves a request of another session that a grant of Capabilities covers', async () => {
  const active = (f = await secretFixture(bundle))
  const token = await active.seed('TOKEN', 'token-value')
  const other = await otherTurn(active)
  const elsewhere = await active.waiting(
    { names: ['TOKEN'], command: 'deploy elsewhere' },
    other.turnId,
  )
  const here = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  await active.request(workspaceCapabilitiesPath(OUTER_ORG, OUTER_WORKSPACE), {
    method: 'PATCH',
    body: JSON.stringify({ preapprovedSecretIds: [token.id] }),
  })
  await active.answer(here.request.id, { kind: 'allow' })
  expect((await requestState(active, elsewhere.request.id)).state).toBe(
    'waiting',
  )
  await active.answer(elsewhere.request.id, { kind: 'deny' })
})
