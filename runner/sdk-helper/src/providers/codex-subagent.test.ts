import { beforeEach, expect, it, onTestFinished } from 'vitest'

import { FakeAppServers } from '../../test-support/app-server'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { providerFixture } from '../../test-support/fixture'
import { duringTurn, turn } from '../../test-support/input'
import { createCodexFactory } from './codex'

beforeEach(mockComputerServer)

it('steers the conversation turn while a Codex subagent runs its own turn', async () => {
  const h = await providerFixture('codex')
  const servers = new FakeAppServers()
  const provider = await createCodexFactory(servers.start)(h.options)
  onTestFinished(() => provider.close())
  await provider.send(h.command)
  const server = servers.latest
  const main = { threadId: 'codex-conversation', turnId: 'codex-turn-1' }
  const child = { threadId: 'subagent-thread', turnId: 'subagent-turn' }
  server.notify('turn/started', {
    threadId: main.threadId,
    turn: { id: main.turnId },
  })
  server.notify('turn/started', {
    threadId: child.threadId,
    turn: { id: child.turnId },
  })
  server.notify('item/agentMessage/delta', {
    ...child,
    itemId: 'subagent-answer',
    delta: 'Child text',
  })
  server.notify('item/completed', {
    ...child,
    item: { id: 'subagent-answer', type: 'agentMessage', text: 'Child text' },
  })

  await provider.send({
    ...duringTurn(turn('2', 'alice', 'codex')),
    turnId: 'turn-1',
  })
  expect(
    server.writes.find((write) => write.method === 'turn/steer'),
  ).toMatchObject({
    params: { threadId: main.threadId, expectedTurnId: main.turnId },
  })

  server.notify('turn/completed', {
    threadId: child.threadId,
    turn: { id: child.turnId, status: 'completed' },
  })
  await provider.send({
    ...duringTurn(turn('3', 'alice', 'codex')),
    turnId: 'turn-1',
  })
  expect(
    server.writes.filter((write) => write.method === 'turn/start'),
  ).toHaveLength(1)
  expect(
    server.writes.findLast((write) => write.method === 'turn/steer'),
  ).toMatchObject({ params: { expectedTurnId: main.turnId } })
  expect(h.events).not.toContainEqual(
    expect.objectContaining({ messageId: 'subagent-answer' }),
  )
  expect(h.events).not.toContainEqual(
    expect.objectContaining({ type: 'result' }),
  )

  server.notify('turn/completed', {
    threadId: main.threadId,
    turn: { id: main.turnId, status: 'completed' },
  })
  expect(h.events).toContainEqual({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-1', 'message-2', 'message-3'],
  })
})
