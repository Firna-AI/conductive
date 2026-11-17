import { afterEach, beforeAll, expect, it } from 'vitest'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { secretFixture, type SecretFixture } from './requests.test-support'
import {
  lateThenWaiting,
  notices,
  requestState,
  workspaceState,
} from './covered.test-support'

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

it('records no lifetime on a covered request that asked for no value', async () => {
  const active = (f = await secretFixture(bundle))
  await active.seed('STORED', 'stored-value')
  const { late, waiting } = await lateThenWaiting(
    active,
    ['STORED'],
    ['STORED', 'MISSING'],
  )
  await active.answer(waiting.request.id, {
    kind: 'values',
    lifetime: '15-minutes',
    values: { MISSING: 'missing-value' },
  })
  expect(await requestState(active, late.request.id)).toMatchObject({
    state: 'allowed',
    lifetime: null,
  })
})
