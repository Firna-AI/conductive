import { expect, it } from 'vitest'

import { issueMachineToken, workspaceMachineOwner } from '../machines/client'
import {
  hello,
  helloMessage,
  setupOwnComputers,
  tokenFrom,
} from './fixture.test-support'

const setup = setupOwnComputers()

it('consumes a code in only one concurrent exchange and refuses replays after welcome', async () => {
  const f = await setup()
  const added = await f.add()
  const replies = await Promise.all([
    f.dispatch('POST', added.code),
    f.dispatch('POST', added.code),
  ])
  expect(replies.map((response) => response.status).sort()).toEqual([200, 401])

  const winner = replies.find((response) => response.status === 200)
  if (!winner) throw new Error('Expected a successful exchange.')
  const token = await tokenFrom(winner)
  await hello(await f.open(token))
  expect((await f.dispatch('POST', added.code)).status).toBe(401)
})

it('refuses expired and removed codes with the same error', async () => {
  const f = await setup()
  const expired = await f.add('expired')
  const removed = await f.add('removed')
  await f.db
    .prepare('UPDATE own_computers SET code_expires_at = 0 WHERE id = ?')
    .bind(expired.computerId)
    .run()
  expect((await f.request(removed.path, 'DELETE')).status).toBe(204)

  for (const credential of [expired.code, removed.code]) {
    const response = await f.dispatch('POST', credential)
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: {
        code: 'computer_credential_required',
        message: 'The connection is not available.',
      },
    })
  }
})

it('replaces an unused code and revokes a token that never welcomed', async () => {
  const f = await setup()
  const added = await f.add()
  const replacement = await added.newCode()
  expect((await f.dispatch('POST', added.code)).status).toBe(401)

  const token = await tokenFrom(await f.dispatch('POST', replacement.code))
  const socket = await f.open(token)
  expect((await f.request(added.codePath)).status).toBe(409)
  const newest = await added.newCode()
  expect((await f.dispatch('GET', token)).status).toBe(401)
  socket.send(helloMessage())
  expect(await socket.closed).toBe(4003)

  const reissued = await tokenFrom(await f.dispatch('POST', newest.code))
  await hello(await f.open(reissued))
})

it('keeps one-time codes, computer tokens, and machine tokens on their own routes', async () => {
  const f = await setup()
  const added = await f.add()
  expect((await f.dispatch('GET', added.code)).status).toBe(401)
  const token = await added.enroll()
  expect((await f.dispatch('POST', token)).status).toBe(401)
  expect((await f.dispatch('GET', token, {}, f.hostPath)).status).toBe(401)
  const machine = await issueMachineToken(
    f.harness.env,
    workspaceMachineOwner(f.org.id, 'cloud-computer'),
  )
  expect((await f.dispatch('GET', machine)).status).toBe(401)
})

it('refuses Origin and Cookie on both computer methods', async () => {
  const f = await setup()
  const added = await f.add()
  const headers: Record<string, string>[] = [
    { Origin: f.harness.env.APP_ORIGIN },
    { Cookie: 'browser=1' },
  ]
  for (const header of headers)
    expect((await f.dispatch('POST', added.code, header)).status).toBe(403)
  const token = await added.enroll()
  for (const header of headers)
    expect((await f.dispatch('GET', token, header)).status).toBe(403)
})
