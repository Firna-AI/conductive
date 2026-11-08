import { beforeEach, expect, it, onTestFinished } from 'vitest'

import { FakeClaudeQuery } from '../../test-support/claude-query'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { runnerHarness, turn } from '../../test-support/harness'
import { string } from '../parse'
import { Runner } from '../runner'
import { createClaudeFactory } from './claude'

beforeEach(mockComputerServer)

async function queuedClaudeTurn() {
  const h = await runnerHarness()
  await h.runner.close()
  const sdk = new FakeClaudeQuery()
  const runner = new Runner({
    ...h.options,
    providers: {
      ...h.options.providers,
      claude: createClaudeFactory(sdk.open, () => '/pinned/claude'),
    },
  })
  onTestFinished(() => runner.close())
  await runner.start(false)
  const first = turn()
  first.message.text = 'Message 1.'
  h.endpoint.send(first)
  for (let id = 2; id <= 65; id++)
    h.endpoint.send({
      ...turn(String(id)),
      type: 'message',
      turnId: 'turn-1',
      message: { ...turn(String(id)).message, text: `Message ${id}.` },
    })
  await runner.idle()
  const sent: string[] = []
  for (let id = 1; id <= 64; id++) {
    const message = await sdk.nextUser()
    expect(message.message).toEqual({ role: 'user', content: `Message ${id}.` })
    sent.push(string(message.uuid))
  }
  return { ...h, runner, sdk, sent }
}

it('holds the 65th Claude message until a result frees input and completes the exact turn', async () => {
  const h = await queuedClaudeTurn()
  let delivered = false
  const pending = h.sdk.nextUser().then((message) => {
    delivered = true
    return message
  })
  await h.sdk.raw({ type: 'system', subtype: 'init', session_id: 'sdk-ready' })
  await h.runner.idle()
  expect(delivered).toBe(false)
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuids: h.sent,
  })
  const last = await pending
  expect(last.message).toEqual({ role: 'user', content: 'Message 65.' })
  expect(h.sent).not.toContain(last.uuid)
  await h.runner.idle()
  const completed = () =>
    h.endpoint.runnerEvents.flatMap(({ event }) =>
      event.type === 'turn.completed' ? [event] : [],
    )
  expect(completed()).toEqual([])
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuids: [last.uuid],
  })
  await h.runner.idle()
  expect(completed()).toEqual([
    {
      type: 'turn.completed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      state: 'finished',
      durationMs: 0,
      files: [],
      omittedFileCount: 0,
      userMessageIds: Array.from(
        { length: 65 },
        (_, index) => `message-${index + 1}`,
      ),
    },
  ])
  expect(h.warnings).toEqual([])
})

it('frees Claude input only for explicitly listed outstanding SDK UUIDs on each result', async () => {
  const h = await runnerHarness()
  await h.runner.close()
  const sdk = new FakeClaudeQuery()
  const first = turn()
  const provider = await createClaudeFactory(
    sdk.open,
    () => '/pinned/claude',
  )({
    cwd: h.root,
    home: h.home,
    login: first.login,
    choice: first.message.choice,
    conversationId: null,
    event: () => {},
    warn: h.options.warn,
  })
  onTestFinished(() => provider.close())
  for (let id = 1; id <= 65; id++) await provider.send(turn(String(id)))
  const sent: string[] = []
  for (let id = 1; id <= 64; id++)
    sent.push(string((await sdk.nextUser()).uuid))
  let delivered = false
  const pending = sdk.nextUser().then((message) => {
    delivered = true
    return message
  })
  await sdk.raw({
    type: 'assistant',
    user_message_uuid: sent[0],
    message: { id: 'retained-association', content: [] },
  })
  await sdk.raw({ type: 'result', is_error: false })
  expect(delivered).toBe(false)
  await sdk.raw({ type: 'result', is_error: false, user_message_uuids: [] })
  expect(delivered).toBe(false)
  await sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuids: ['unknown-sdk-uuid'],
  })
  expect(delivered).toBe(false)
  await sdk.raw({ type: 'result', is_error: false, user_message_uuid: sent[0] })
  const last = await pending
  await provider.send(turn('66'))
  let nextDelivered = false
  const next = sdk.nextUser().then((message) => {
    nextDelivered = true
    return message
  })
  await sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuids: [sent[0]],
  })
  expect(nextDelivered).toBe(false)
  await sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuids: [last.uuid],
  })
  expect((await next).message).toEqual({
    role: 'user',
    content: 'Change the file.',
  })
})

it('discards the held 65th Claude message when Stop closes SDK input', async () => {
  const h = await queuedClaudeTurn()
  let delivered = false
  const pending = h.sdk.nextInput().then((message) => {
    delivered = true
    return message
  })
  await h.sdk.raw({ type: 'system', subtype: 'init', session_id: 'sdk-ready' })
  await h.runner.idle()
  expect(delivered).toBe(false)
  h.endpoint.send({
    type: 'interrupt',
    commandId: 'stop',
    sessionId: 'session-1',
    turnId: 'turn-1',
  })
  await h.runner.idle()
  expect(await pending).toEqual({ done: true, value: undefined })
  expect(h.sdk.closed).toBe(true)
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.completed',
    turnId: 'turn-1',
    state: 'stopped',
  })
  expect(h.warnings).toEqual([])
})
