import { expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { SendMessageResponse } from '../../src/shared/messages'
import {
  MACHINE_ORIGIN,
  WORKSPACE_ID,
  WORKSPACE_TOKEN,
} from './harness.test-support'
import { setupProviderStopTests } from './provider-stop.test-support'
import { retryRequest, sessionRecord } from './retry.test-support'
import { lifecycleSnapshot } from './turn-lifecycle.test-support'

const fixtureForTest = setupProviderStopTests()

it('retries the first original message when an uncertain successor fails before its input is chosen', async () => {
  const fixture = await fixtureForTest()
  const session = await fixture.createSession()
  await fixture.send(session.id, 'source')
  await fixture.send(
    session.id,
    'unanswered',
    fixture.ownerCookie,
    session.choice,
    'Later input',
  )
  await fixture.stopForProvider()
  await fixture.actor.api.peers.connectRunner('unsupported', {
    url: `${MACHINE_ORIGIN}${MACHINE_PATHS.runner}`,
    headers: { Authorization: `Bearer ${WORKSPACE_TOKEN}` },
  })
  await fixture.actor.api.peers.receiveRunner('unsupported', {
    type: 'hello',
    protocolVersion: 1,
    workspaceId: WORKSPACE_ID,
    streamId: 'unsupported-stream',
  })
  expect((await sessionRecord(fixture, session.id)).retryMessageId).toBe(
    'source',
  )
  const response = await retryRequest(
    fixture,
    session.id,
    'source',
    fixture.memberCookie,
  )
  expect(response.status).toBe(202)
  const reply: SendMessageResponse = await response.json()
  expect(reply.message).toMatchObject({
    text: 'Check this code',
    sender: { id: fixture.member.id },
  })
  expect(reply.message.id).not.toMatch(/^continuation:/)
  expect(
    (await lifecycleSnapshot(fixture)).messages.filter((message) =>
      message?.id.startsWith('continuation:'),
    ),
  ).toEqual([])
})
