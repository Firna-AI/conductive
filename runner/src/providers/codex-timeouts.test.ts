import { afterEach, beforeEach, expect, it, onTestFinished, vi } from 'vitest'

import { FakeAppServers } from '../../test-support/app-server'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { turn } from '../../test-support/harness'
import { fakeToolContext } from '../../test-support/providers'
import { object } from '../parse'
import { createCodexFactory } from './codex'
import * as environment from './environment'
import type { ProviderEvent } from './types'

beforeEach(() => {
  mockComputerServer()
  vi.spyOn(environment, 'prepareProviderHome').mockResolvedValue()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function fixture(pendingList = false) {
  const servers = new FakeAppServers()
  if (pendingList) servers.skillsList = () => new Promise(() => {})
  const events: ProviderEvent[] = []
  const warnings: string[] = []
  const command = turn('1', 'alice', 'codex')
  const provider = await createCodexFactory(servers.start)({
    cwd: '/repo',
    home: '/agent-home',
    sessionId: command.sessionId,
    endpoint: 'https://gateway.test/codex',
    credential: { type: 'gateway', ...command.credential },
    commitAuthor: null,
    choice: command.message.choice,
    conversationId: null,
    instructions: '',
    tools: fakeToolContext,
    event: (event) => events.push(event),
    warn: (message) => warnings.push(message),
  })
  onTestFinished(() => provider.close())
  await provider.send(command)
  return { provider, server: servers.latest, events, warnings }
}

it('keeps the turn running and warns once when the skill list times out', async () => {
  const h = await fixture(true)
  await vi.advanceTimersByTimeAsync(59_999)
  expect(h.server.closed).toBe(false)
  expect(h.warnings).toEqual([])
  await vi.advanceTimersByTimeAsync(1)
  expect(h.server.closed).toBe(false)
  expect(h.warnings).toEqual([
    'The Codex skill list could not be read. The turn will continue.',
  ])
  h.server.notify('item/agentMessage/delta', {
    itemId: 'answer',
    delta: 'The work continues.',
  })
  h.server.notify('turn/completed', {
    turn: { id: 'codex-turn-1', status: 'completed' },
  })
  expect(h.events.filter((event) => event.type !== 'conversation')).toEqual([
    { type: 'delta', messageId: 'answer', text: 'The work continues.' },
    { type: 'result', state: 'finished', userMessageIds: ['message-1'] },
  ])
})

it('closes the connection when a required request times out', async () => {
  const h = await fixture()
  const write = h.server.write.bind(h.server)
  vi.spyOn(h.server, 'write').mockImplementation((line) => {
    if (object(JSON.parse(line)).method !== 'turn/interrupt') write(line)
  })
  const rejected = expect(h.provider.interrupt()).rejects.toThrow(
    'The agent request did not finish.',
  )
  await vi.advanceTimersByTimeAsync(59_999)
  expect(h.server.closed).toBe(false)
  await vi.advanceTimersByTimeAsync(1)
  await rejected
  expect(h.server.closed).toBe(true)
  expect(h.events.filter((event) => event.type === 'failed')).toEqual([
    {
      type: 'failed',
      code: 'agent_exited',
      message: 'The agent process ended.',
    },
  ])
})

it('gives no skill-list warning when the connection closes during the request', async () => {
  const h = await fixture(true)
  await h.provider.close()
  await vi.advanceTimersByTimeAsync(60_000)
  expect(h.server.closed).toBe(true)
  expect(h.warnings).toEqual([])
})
