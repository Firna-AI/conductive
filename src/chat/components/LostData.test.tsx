import { describe, expect, it } from 'vitest'
import type {
  AgentChatEvent,
  RunnerEventRefused,
  ToolCall,
} from '../../shared/chat-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { renderChat, textOf } from './render-kit'

const turn = { sessionId: FAKE_IDS.session, turnId: 'turn-1' }
const streamId = 'stream-7f3a'

/** A tool update of the turn, with the output that its detail left out. */
function update(
  id: string,
  target: string,
  omittedDetailBytes: number,
  state: ToolCall['state'] = 'done',
): AgentChatEvent {
  const tool: ToolCall = {
    id,
    kind: 'run',
    target,
    detail: null,
    omittedDetailBytes,
    state,
  }
  return { ...turn, type: 'tool.updated', tool }
}

/** A refusal marker of the session, for the turn unless `fields` says. */
function refused(
  runnerEventNumber: number,
  runnerEventType: RunnerEventRefused['runnerEventType'],
  reason: RunnerEventRefused['reason'],
  fields: Partial<RunnerEventRefused> = {},
): RunnerEventRefused {
  return {
    ...turn,
    type: 'runner.event-refused',
    streamId,
    runnerEventNumber,
    runnerEventType,
    reason,
    ...fields,
  }
}

/** How many times a part shows in a text. */
const count = (text: string, part: string) => text.split(part).length - 1

/** The folded line of each run of tool calls, and whether the run is open. */
function runs(markup: string) {
  return [
    ...markup.matchAll(/<details([^>]*)><summary[^>]*>(.*?)<\/summary>/gs),
  ].map(([, attributes, summary]) => ({
    open: attributes.includes(' open'),
    text: textOf(summary).trim(),
  }))
}

describe('data that the runner left out', () => {
  it('names the output left out of each call, and the total on a folded run', async () => {
    const { chat, markup, text } = await renderChat({ conversation: 'running' })
    expect(count(text(), 'left out')).toBe(0)
    chat.emit(update('l', 'lint', 0))
    chat.emit(update('u', 'unit', 614_400))
    chat.emit(update('e', 'e2e', 614_400))
    expect(text()).toContain('Ran lint Ran unit 600 KB left out Ran e2e 600 KB')
    expect(runs(markup()).at(-1)?.text).toContain('1.2 MB of output left out')

    chat.emit(update('u', 'unit', 307_200))
    chat.emit({
      ...turn,
      type: 'turn.completed',
      state: 'finished',
      durationMs: 1_000,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [],
    })
    expect(text()).toContain('Ran unit 300 KB left out')
    expect(count(text(), 'left out')).toBe(3)
    expect(runs(markup()).at(-1)).toEqual({
      open: false,
      text: expect.stringContaining('900 KB of output left out'),
    })
  })

  it('counts the files left out after a finished turn and on a stopped line', async () => {
    const { chat, text } = await renderChat({ conversation: 'running' })
    const end = {
      type: 'turn.completed',
      durationMs: 1_000,
      files: [],
      userMessageIds: [],
    } as const
    chat.emit({
      ...turn,
      ...end,
      state: 'finished',
      files: [{ path: 'src/Cart.tsx', change: 'added', added: 2, removed: 0 }],
      omittedFileCount: 47,
    })
    expect(text()).toMatch(/Cart\.tsx.*47 more files/)

    const stopped = { ...turn, turnId: 'turn-2' }
    chat.emit({
      ...stopped,
      type: 'turn.stop-requested',
      requestedById: 'jonas',
    })
    chat.emit({ ...stopped, ...end, state: 'stopped', omittedFileCount: 31 })
    expect(text()).toContain(
      'Jonas Weber stopped the agent · 31 changed files not listed',
    )

    chat.emit({
      ...turn,
      turnId: 'turn-3',
      ...end,
      state: 'stopped',
      omittedFileCount: 0,
    })
    chat.emit({
      ...turn,
      turnId: 'turn-4',
      ...end,
      state: 'finished',
      omittedFileCount: 0,
    })
    expect(text()).toContain('not listed The agent stopped 1s ')
    expect(count(text(), 'more files')).toBe(1)
    expect(count(text(), 'not listed')).toBe(1)
  })
})

describe('runner events that the workspace refused', () => {
  it('shows each event of the session once, as one line at its place', async () => {
    const { chat, text } = await renderChat({ conversation: 'running' })
    const tooLarge = refused(12, 'tool.updated', 'too_large')
    chat.emit(update('p', 'profile', 0))
    chat.emit(tooLarge)
    chat.emit(update('u', 'unit', 0))
    chat.emit(refused(14, 'assistant.delta', 'invalid', { turnId: null }))
    chat.emit(
      refused(15, 'turn.thinking', 'invalid', { sessionId: 'another-session' }),
    )
    chat.emit(
      refused(16, 'files.snapshot', 'too_large', {
        sessionId: null,
        turnId: null,
      }),
    )
    chat.emit(tooLarge)

    const shown = text()
    const first = 'A tool update was lost because it was too large'
    const second =
      'Part of a reply from the agent was lost because it could not be read'
    expect(shown).toContain(
      `Ran profile ${first} 1 tool call Ran unit ${second} Working 2m 41s`,
    )
    expect([count(shown, first), count(shown, second)]).toEqual([1, 1])
    expect(count(shown, 'was lost because')).toBe(2)
    for (const internal of [streamId, 'tool.updated', 'too_large', 'delta']) {
      expect(shown).not.toContain(internal)
    }
  })

  it('ends the turn of a refused end without its time, files, or Try again', async () => {
    const { chat, text } = await renderChat({ conversation: 'running' })
    chat.emit(update('u', 'unit', 0, 'running'))
    chat.emit(
      refused(20, 'turn.completed', 'turn_not_active', { turnId: 'turn-0' }),
    )
    const inactive =
      'The summary of this turn was lost because its turn was not running'
    expect(text()).toContain(`${inactive} Working 2m 41s`)
    const ended = /Working|Thinking|Try again|This turn stopped|\b\d+[smh]\b/

    chat.emit(refused(21, 'turn.completed', 'invalid'))
    expect(text()).toContain(
      `Ran unit Stopped ${inactive} The summary of this turn was lost because it could not be read`,
    )
    expect(text()).not.toMatch(ended)

    const next = { ...turn, turnId: 'turn-2' }
    chat.emit({ ...next, type: 'turn.thinking' })
    chat.emit({ ...update('b', 'build', 0, 'running'), turnId: 'turn-2' })
    expect(text()).toContain('Running build Working 2m 41s')
    chat.emit(refused(22, 'turn.failed', 'too_large', { turnId: 'turn-2' }))
    expect(text()).toContain(
      'Ran build Stopped The error of this turn was lost because it was too large',
    )
    expect(text()).not.toMatch(ended)
  })

  it('keeps Try again on a failed turn when a later line follows it', async () => {
    const { chat, text } = await renderChat({ conversation: 'failed' })
    chat.emit(refused(30, 'tool.updated', 'turn_not_active'))
    expect(text()).toMatch(
      /Try again A tool update was lost because its turn was not running/,
    )
  })

  it('takes Try again from a failed turn when a newer turn loses its end', async () => {
    const { chat, text } = await renderChat({ conversation: 'running' })
    const { message } = workspaceFixtures()
    const queued = {
      ...message,
      id: 'ask-2',
      text: 'Then add tests for the form.',
      state: 'queued' as const,
    }
    chat.emit({ type: 'message.accepted', message: queued })
    chat.emit({
      ...turn,
      type: 'turn.failed',
      error: { code: 'agent_unavailable', message: 'The agent is busy.' },
      retryMessageId: message.id,
      durationMs: 1_000,
    })
    expect(text()).toContain('Try again')

    chat.emit({
      ...turn,
      turnId: 'turn-2',
      type: 'turn.started',
      senderId: message.sender.id,
      choice: message.choice,
      startedAt: FAKE_TIME,
      messageIds: [queued.id],
    })
    chat.emit(refused(40, 'turn.completed', 'invalid', { turnId: 'turn-2' }))
    expect(text()).not.toContain('Try again')
    expect(text()).toContain(
      'The agent is busy. The summary of this turn was lost because it could not be read',
    )
  })
})
