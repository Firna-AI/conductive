import { expect, it, vi } from 'vitest'

import type { ProviderEvent } from '../sdk-helper/src/generated/ProviderEvent'
import type {
  ProviderOptions,
  ProviderProcess,
} from '../sdk-helper/src/providers/types'
import { MemoryHelper } from '../test-support/helper'
import { duringTurn, turn } from '../test-support/harness'
import { FakeProviders, fakeToolContext } from '../test-support/providers'
import { deferred } from '../test-support/runtime'
import { createHelperFactory } from './sdk-helper'

function fixture() {
  const providers = new FakeProviders()
  const helper = new MemoryHelper({
    claude: providers.open,
    codex: providers.open,
  })
  const events: ProviderEvent[] = []
  const command = turn()
  const options: ProviderOptions = {
    cwd: '/repo',
    home: '/private/home',
    sessionId: command.sessionId,
    endpoint: 'https://machine.test/v1/model/claude',
    credential: { type: 'gateway', ...command.credential },
    commitAuthor: { name: 'Alice', email: 'alice@example.test' },
    choice: { ...command.message.choice, fast: true },
    conversationId: 'saved-conversation',
    instructions: 'Saved instructions',
    tools: fakeToolContext,
    backgroundNoteIds: new Set(['task:old']),
    event: (event) => events.push(event),
    warn: vi.fn(),
  }
  return {
    providers,
    helper,
    events,
    options,
    command,
    start: createHelperFactory(() => helper),
  }
}

it('streams events, exact result lists, controls, and background notes over the helper protocol', async () => {
  const h = fixture()
  const provider = await h.start(h.options)
  await provider.send(h.command)
  await provider.send(duringTurn(turn('2')))
  expect(
    await provider.model({
      agent: 'claude',
      model: 'new-model',
      effort: 'ultra',
      fast: true,
    }),
  ).toBe('applied')
  await provider.interrupt()
  const agent = h.providers.latest
  const process: ProviderProcess = agent
  vi.spyOn(process, 'model').mockResolvedValue('deferred')
  expect(await provider.model(h.options.choice)).toBe('deferred')
  agent.options.backgroundNoteIds?.add('cron:new')
  agent.options.backgroundNotes?.([...(agent.options.backgroundNoteIds ?? [])])
  agent.emit({
    type: 'speed',
    speed: { state: 'standard', cause: 'fast_limit' },
  })
  agent.emit({ type: 'background', live: true, idle: true })
  agent.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-2'],
  })
  expect(agent.messages.map((input) => input.message.id)).toEqual([
    'message-1',
    'message-2',
  ])
  expect(agent.options.commitAuthor).toEqual({
    name: 'Alice',
    email: 'alice@example.test',
  })
  expect(agent.options.conversationId).toBe('saved-conversation')
  expect(agent.options.instructions).toBe('Saved instructions')
  expect(agent.options.choice.fast).toBe(true)
  expect(agent.choices).toEqual([
    { agent: 'claude', model: 'new-model', effort: 'ultra', fast: true },
  ])
  expect(agent.interrupts).toBe(1)
  expect(h.options.backgroundNoteIds).toEqual(new Set(['task:old', 'cron:new']))
  expect(h.events).toEqual([
    { type: 'conversation', id: 'saved-conversation' },
    { type: 'speed', speed: { state: 'standard', cause: 'fast_limit' } },
    { type: 'background', live: true, idle: true },
    { type: 'result', state: 'finished', userMessageIds: ['message-2'] },
  ])
  await provider.close()
})

it('waits for helper process exit after agent close and its response', async () => {
  const h = fixture()
  h.helper.holdExit = true
  const provider = await h.start(h.options)
  let closed = false
  const closing = provider.close().then(() => {
    closed = true
  })
  await h.helper.ended.promise
  await new Promise<void>((resolve) => setImmediate(resolve))
  expect(h.providers.latest.closed).toBe(true)
  expect(closed).toBe(false)
  h.helper.finish()
  await closing
  expect(closed).toBe(true)
})

it('fails pending requests and emits a failure when the helper exits unexpectedly', async () => {
  const h = fixture()
  const provider = await h.start(h.options)
  const pending = deferred<void>()
  h.providers.latest.send = () => pending.promise
  const sending = provider.send(h.command)
  const rejected = expect(sending).rejects.toThrow(
    'The SDK helper process ended.',
  )
  h.helper.finish()
  await rejected
  expect(h.events.at(-1)).toEqual({
    type: 'failed',
    code: 'agent_exited',
    message: 'The SDK helper process ended.',
  })
  pending.resolve()
  await provider.close()
})

it('cancels pending helper setup and waits for its cleanup', async () => {
  const h = fixture()
  const entered = deferred<void>()
  const cleanup = vi.fn(async () => {})
  const controller = new AbortController()
  const helper = new MemoryHelper({
    claude: async (options) => {
      options.lifetime?.registerCleanup(cleanup)
      entered.resolve()
      await new Promise<void>((resolve) =>
        options.signal?.addEventListener('abort', () => resolve(), {
          once: true,
        }),
      )
      options.signal?.throwIfAborted()
      return h.providers.open(options)
    },
    codex: h.providers.open,
  })
  const starting = createHelperFactory(() => helper)({
    ...h.options,
    signal: controller.signal,
  })
  const rejected = expect(starting).rejects.toThrow()
  await entered.promise
  controller.abort()
  await rejected
  await helper.exited
  expect(cleanup).toHaveBeenCalledTimes(1)
  expect(h.providers.processes).toEqual([])
})
