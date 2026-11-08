import { expect, it, onTestFinished, vi } from 'vitest'

import type { AgentChatEvent } from '../../src/shared/chat-events'
import { mapTool } from './providers/tool'
import { TurnOutput } from './turn-output'

const context = { sessionId: 'session', turnId: 'turn' }

function outputFixture() {
  vi.useFakeTimers()
  onTestFinished(() => {
    vi.useRealTimers()
  })
  const emit = vi.fn<(event: AgentChatEvent) => Promise<void>>()
  emit.mockResolvedValue(undefined)
  const output = new TurnOutput(context, emit, () => {})
  return { output, emit }
}

it('attempts every buffered streaming message once before rejecting with the first save error', async () => {
  const { output, emit } = outputFixture()
  await output.accept({ type: 'delta', messageId: 'first', text: 'First' })
  await output.accept({ type: 'delta', messageId: 'second', text: 'Second.' })
  await output.accept({ type: 'delta', messageId: 'first', text: ' message.' })
  const first = new Error('The first text save failed.')
  emit.mockRejectedValueOnce(first)
  emit.mockRejectedValueOnce(new Error('The second text save failed.'))
  await expect(output.flush()).rejects.toBe(first)
  expect(emit.mock.calls.map(([event]) => event)).toEqual([
    {
      type: 'assistant.delta',
      ...context,
      messageId: 'first',
      text: 'First message.',
    },
    {
      type: 'assistant.delta',
      ...context,
      messageId: 'second',
      text: 'Second.',
    },
  ])
  emit.mockReset().mockResolvedValue(undefined)
  await output.flush()
  expect(emit.mock.calls).toEqual([])
})

it('drains buffered text and its initiating event before rejecting with the first save error', async () => {
  const { output, emit } = outputFixture()
  const tool = mapTool('tool', 'Read', { path: 'file.txt' }, 'running')
  await output.accept({ type: 'delta', messageId: 'first', text: 'First.' })
  await output.accept({ type: 'delta', messageId: 'second', text: 'Second.' })
  const first = new Error('The first text save failed.')
  emit.mockRejectedValueOnce(first)
  emit.mockRejectedValueOnce(new Error('The second text save failed.'))
  await expect(output.accept({ type: 'tool', tool })).rejects.toBe(first)
  expect.soft(emit.mock.calls.map(([event]) => event)).toEqual([
    {
      type: 'assistant.delta',
      ...context,
      messageId: 'first',
      text: 'First.',
    },
    {
      type: 'assistant.delta',
      ...context,
      messageId: 'second',
      text: 'Second.',
    },
    { type: 'tool.updated', ...context, tool },
  ])
  emit.mockReset().mockResolvedValue(undefined)
  await output.flush()
  await output.finish('stopped')
  expect(emit.mock.calls.map(([event]) => event)).toEqual([
    { type: 'tool.updated', ...context, tool: { ...tool, state: 'stopped' } },
  ])
})

it('attempts every running-tool stop before rejecting with the first save error', async () => {
  const { output, emit } = outputFixture()
  const firstTool = mapTool('first', 'Read', { path: 'first.txt' }, 'running')
  const secondTool = mapTool(
    'second',
    'Read',
    { path: 'second.txt' },
    'running',
  )
  await output.accept({ type: 'tool', tool: firstTool })
  await output.accept({ type: 'tool', tool: secondTool })
  emit.mockClear()
  const first = new Error('The first tool stop save failed.')
  emit.mockRejectedValueOnce(first)
  emit.mockRejectedValueOnce(new Error('The second tool stop save failed.'))
  await expect(output.finish('stopped')).rejects.toBe(first)
  expect(emit.mock.calls.map(([event]) => event)).toEqual([
    {
      type: 'tool.updated',
      ...context,
      tool: { ...firstTool, state: 'stopped' },
    },
    {
      type: 'tool.updated',
      ...context,
      tool: { ...secondTool, state: 'stopped' },
    },
  ])
  emit.mockReset().mockResolvedValue(undefined)
  await output.finish('stopped')
  expect(emit.mock.calls).toEqual([])
})
