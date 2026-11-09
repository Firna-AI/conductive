import { afterAll, beforeAll, expect, it } from 'vitest'

import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(() => harness.dispose())

it('keeps a protocol 2 credential after a failed send and dispatches queued messages in order', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const first = await fixture.send(session.id, 'failed-send')
  await fixture.send(session.id, 'queued-follow-up')
  let credential: string | undefined
  fixture.transport.dropOutgoing = (message) => {
    if (message.type === 'turn') {
      credential = message.credential?.token
      throw new Error('Injected gateway turn send failure')
    }
    return false
  }
  const runner = new FakeRunner({
    workspaceId: WORKSPACE_ID,
    protocolVersion: 2,
  })
  runner.emit({ type: 'runner.ready' })
  await fixture.connect(runner)
  expect(runner.commands).toEqual([])
  expect(credential).toEqual(expect.stringMatching(/^sk-ant-api-/))
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.turn(first.session.activeTurnId ?? ''),
    ),
  ).toMatchObject({
    state: 'queued',
    started: false,
    gateway: { nonce: expect.any(String) },
  })
  fixture.transport.dropOutgoing = () => false
  fixture.restart()
  await fixture.connect(runner)
  expect(runner.commands).toMatchObject([
    {
      type: 'turn',
      message: { id: 'failed-send' },
      credential: { token: credential },
    },
    { type: 'message', message: { id: 'queued-follow-up' } },
  ])
  expect(runner.commands[1]).not.toHaveProperty('credential')
  expect(runner.commands[1]).not.toHaveProperty('login')
  expect(JSON.stringify([...fixture.storage.records])).not.toContain(credential)
  expect(JSON.stringify([...fixture.storage.records])).not.toContain(
    `secret-${fixture.owner.id}-claude`,
  )
  fixture.chat.closeConnections()
})
