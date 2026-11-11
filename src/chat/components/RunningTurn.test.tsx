import { describe, expect, it } from 'vitest'
import type { WorkspaceEvent } from '../../shared/events'
import { chatHistoryPath } from '../../shared/events'
import { sessionPaths, sessionsPath } from '../../shared/sessions'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { recordedChatEvents } from '../../test-support/recorded-chat'
import { shown } from '../state/test-kit'
import { turn, update } from './event-kit'
import { renderChat } from './render-kit'

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace
const id = FAKE_IDS.session
const busy = /Working|Thinking|\bStop\b/
const failure = {
  error: { code: 'internal_error', message: 'The server is busy.' },
}

/** Agent text of an older turn that the workspace stored as late. */
const olderWords: WorkspaceEvent = {
  ...turn,
  turnId: 'turn-0',
  type: 'assistant.completed',
  messageId: 'older',
  text: 'Words of an older turn.',
  userMessageIds: [],
}

describe('the running turn of a session', () => {
  it('ends with its calls and its Stop request when a newer record names no turn', async () => {
    const { chat, text } = await renderChat({ conversation: 'running' })
    chat.emit({
      ...turn,
      type: 'assistant.delta',
      messageId: 'b',
      text: 'Next.',
    })
    chat.emit(update('lint', 'npm run lint', 0, 'running'))
    chat.emit({ ...turn, type: 'turn.stop-requested', requestedById: 'jonas' })
    expect(text()).toMatch(busy)
    const [session] = chat.controller.getSnapshot().sessions
    chat.emit({
      type: 'session.updated',
      session: { ...session, activeTurnId: null, activeTurnStartedAt: null },
    })
    expect(text()).not.toMatch(busy)
    expect(shown(chat.controller, id).at(-1)).toBe('tool: npm run lint stopped')
    const state = chat.controller.getSnapshot().sessionStates[id]
    expect(state.transcript.stopRequests).toEqual({})
  })

  it('keeps the newer turn running when a late event of a turn that the chat never saw arrives, also after a reload', async () => {
    const live = await renderChat({ conversation: 'running' })
    const eventNumber = live.chat.nextEventNumber()
    const late = {
      workspaceId: ws,
      eventNumber,
      occurredAt: FAKE_TIME,
      event: olderWords,
      late: true as const,
    }
    live.chat.server.events.emit(late)
    const reload = await renderChat({
      conversation: 'running',
      setup: (server: FakeApiServer) =>
        server.json('GET', chatHistoryPath(org, ws, id), {
          events: [...recordedChatEvents('running'), late],
          throughEventNumber: eventNumber,
        }),
    })
    for (const { chat, text } of [live, reload]) {
      const { transcript } = chat.controller.getSnapshot().sessionStates[id]
      expect(transcript.turn?.turnId).toBe('turn-1')
      expect(transcript.turns.map((known) => known.id)).toEqual(['turn-1'])
      expect(text()).toContain('Words of an older turn.')
      expect(text()).toContain('Working 2m 41s')
    }
  })

  it('ends the turn that still shows as running when a late event of that turn arrives', async () => {
    const { chat, text } = await renderChat({ conversation: 'running' })
    chat.server.events.emit({
      workspaceId: ws,
      eventNumber: chat.nextEventNumber(),
      occurredAt: FAKE_TIME,
      event: {
        ...turn,
        type: 'assistant.delta',
        messageId: 'b',
        text: 'A late part.',
      },
      late: true,
    })
    expect(text()).toContain('A late part.')
    expect(text()).not.toMatch(busy)
  })

  it('shows Stop and the stored start of a turn whose history failed, and keeps that start at its first live text', async () => {
    const debounce = 'debounce'
    const { chat, text } = await renderChat({
      conversation: 'history',
      setup: (server) => {
        const { sessions } = workspaceFixtures()
        server.json('GET', sessionsPath(org, ws), {
          ...sessions,
          sessions: sessions.sessions.map((session) =>
            session.id === debounce
              ? {
                  ...session,
                  activeTurnId: 'turn-7',
                  activeTurnStartedAt: FAKE_TIME - 60_000,
                }
              : session,
          ),
        })
        server.json('GET', chatHistoryPath(org, ws, debounce), failure, 500)
      },
    })
    await chat.controller.select(debounce)
    expect(text()).toContain('Working 3m 41s')
    expect(text()).toContain("Earlier messages didn't load Try again")
    expect(text()).toMatch(/\bStop\b/)
    await chat.controller.interrupt(debounce)
    const interrupt = sessionPaths.interrupt(org, ws, debounce)
    expect(await chat.bodies('POST', interrupt)).toEqual([{ turnId: 'turn-7' }])
    chat.emit({
      sessionId: debounce,
      turnId: 'turn-7',
      type: 'assistant.delta',
      messageId: 'answer-7',
      text: 'Still on it.',
    })
    expect(text()).toContain('Still on it.')
    expect(text()).toContain('Working 3m 41s')
  })

  it('loads the chat with Stop when the history of the first shown session fails', async () => {
    const { chat, text } = await renderChat({
      conversation: 'running',
      setup: (server) =>
        server.json('GET', chatHistoryPath(org, ws, id), failure, 500),
    })
    const snapshot = chat.controller.getSnapshot()
    expect(snapshot.load).toEqual({ state: 'ready' })
    expect(snapshot.sessionStates[id].hydration).toBe('failed')
    expect(text()).toContain("Earlier messages didn't load Try again")
    expect(text()).toMatch(/\bStop\b/)
    expect(chat.after).toEqual([0])
  })

  it('lets a live end win over an active turn that an older record still names', async () => {
    const { chat, text } = await renderChat({ conversation: 'running' })
    chat.emit({
      ...turn,
      type: 'turn.completed',
      state: 'finished',
      durationMs: 1_000,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [],
    })
    const [session] = chat.controller.getSnapshot().sessions
    expect(session.activeTurnId).toBe('turn-1')
    expect(text()).not.toMatch(busy)
    // A record that still names the ended turn does not start it again.
    chat.emit({ type: 'session.updated', session })
    expect(text()).not.toMatch(busy)
  })

  it('frees Stop for a new turn that a record names in place of the turn that the user stopped', async () => {
    const { chat } = await renderChat({ conversation: 'running' })
    const state = () => chat.controller.getSnapshot().sessionStates[id]
    await chat.controller.interrupt(id)
    expect(state().stopping).toBe(true)
    const [session] = chat.controller.getSnapshot().sessions
    chat.emit({
      type: 'session.updated',
      session: {
        ...session,
        activeTurnId: 'turn-2',
        activeTurnStartedAt: FAKE_TIME + 60_000,
      },
    })
    expect(state().transcript.turn?.turnId).toBe('turn-2')
    expect(state().stopping).toBe(false)
    await chat.controller.interrupt(id)
    chat.emit({ ...turn, turnId: 'turn-2', type: 'turn.thinking' })
    expect(state().stopping).toBe(true)
  })
})
