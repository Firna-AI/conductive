import { describe, expect, it } from 'vitest'
import { chatHistoryPath } from '../../shared/events'
import { sessionPaths, sessionsPath } from '../../shared/sessions'
import { workspaceViewPath } from '../../shared/workspace-view'
import { FAKE_IDS, FAKE_TIME, fakeUser } from '../../test-support/fixtures/core'
import { senderSnapshot } from '../../test-support/fixtures/workspaces'
import { chatFor, shown } from './test-kit'

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace
const turn = { sessionId: FAKE_IDS.session, turnId: 'turn-1' }
const recordedHistory = [
  'user: Add address autocomplete to the checkout form. Keep the manual fields as a fallback.',
  'agent: The checkout form now suggests addresses. Manual entry still works.',
  'tool: src/app/checkout/AddressForm.tsx done',
  'end: 252000',
]

describe('ChatController', () => {
  it('loads the shown session, then applies each live event after its last stored number once', async () => {
    const chat = chatFor({ conversation: 'running' })
    await chat.controller.start()
    expect(chat.after).toEqual([7])
    chat.emit({ ...turn, type: 'turn.thinking' })
    const state = () =>
      chat.controller.getSnapshot().sessionStates[turn.sessionId]
    expect(state().transcript.turn?.thinking).toBe(true)
    const envelope = {
      workspaceId: ws,
      eventNumber: chat.server.events.history().throughEventNumber + 1,
      occurredAt: FAKE_TIME,
      event: {
        ...turn,
        type: 'assistant.delta' as const,
        messageId: 'answer-2',
        text: 'It has three fields.',
      },
    }
    chat.server.events.emit(envelope)
    chat.server.events.emit(envelope)
    expect(state().transcript.turn?.thinking).toBe(false)
    expect(shown(chat.controller, turn.sessionId).slice(-2)).toEqual([
      'tool: src/app/checkout/AddressForm.tsx done',
      'agent: It has three fields.',
    ])
  })

  it('shows the full stored history of another session and of a reopened one after the stream moved on', async () => {
    const chat = chatFor({ conversation: 'history' })
    await chat.controller.start()
    chat.emit({
      ...turn,
      type: 'turn.started',
      senderId: 'cal',
      choice: {
        agent: 'claude',
        model: 'Opus 5.5',
        effort: 'high',
        fast: false,
      },
      startedAt: FAKE_TIME,
      messageIds: [],
    })
    await chat.controller.select('debounce')
    expect(shown(chat.controller, 'debounce')).toEqual(recordedHistory)
    const closed = chat.controller.getSnapshot().history[0]
    chat.server.json('POST', sessionPaths.reopen(org, ws, closed.id), {
      session: { ...closed, closedAt: null },
      eventNumber: chat.nextEventNumber(),
    })
    await chat.controller.reopen(closed.id)
    const snapshot = chat.controller.getSnapshot()
    expect(snapshot.activeSessionId).toBe(closed.id)
    expect(snapshot.sessions.map((session) => session.id)).toEqual([
      'autocomplete',
      'debounce',
      closed.id,
    ])
    expect(shown(chat.controller, closed.id)).toEqual(recordedHistory)
    expect(snapshot.sessionStates.debounce.transcript.turn).toBeNull()
  })

  it('takes the workspace title from its events and posts no title request', async () => {
    const chat = chatFor({ conversation: 'history' })
    await chat.controller.start()
    const workspace = chat.controller.getSnapshot().workspace
    chat.emit({ type: 'workspace.title', name: 'Saved carts' })
    expect(chat.controller.getSnapshot().workspace?.name).toBe('Saved carts')
    if (!workspace) throw new Error('The workspace did not load.')
    chat.emit({
      type: 'workspace.updated',
      workspace: { ...workspace, name: 'Saved carts sync', state: 'working' },
    })
    expect(chat.controller.getSnapshot().workspace).toMatchObject({
      name: 'Saved carts sync',
      state: 'working',
    })
    expect(
      chat.server.requests.filter((request) => request.method !== 'GET'),
    ).toEqual([])
  })

  it('opens a new session with the default model as the current tab, and saves the view', async () => {
    const chat = chatFor({ conversation: 'history' })
    chat.server.json('GET', sessionsPath(org, ws), {
      eventNumber: 0,
      sessions: [
        {
          id: 'autocomplete',
          workspaceId: ws,
          title: 'Address autocomplete',
          choice: {
            agent: 'claude',
            model: 'Opus 5.5',
            effort: 'high',
            fast: false,
          },
          createdAt: FAKE_TIME,
          closedAt: null,
          activeTurnId: null,
          activeTurnStartedAt: null,
          retryMessageId: null,
          startedBy: senderSnapshot(fakeUser),
          sourceSessionId: null,
          loginAvailable: true,
          loginShared: true,
        },
      ],
      history: [10, 30, 20].map((closedAt) => ({
        id: `closed-${closedAt}`,
        workspaceId: ws,
        title: 'Old',
        choice: {
          agent: 'codex',
          model: 'GPT-6.1 Sol',
          effort: 'medium',
          fast: false,
        },
        createdAt: 1,
        closedAt,
        activeTurnId: null,
        activeTurnStartedAt: null,
        retryMessageId: null,
        startedBy: senderSnapshot(fakeUser),
        sourceSessionId: null,
        loginAvailable: true,
        loginShared: true,
      })),
    })
    await chat.controller.start()
    expect(
      chat.controller.getSnapshot().history.map((session) => session.closedAt),
    ).toEqual([30, 20, 10])
    const fresh = {
      id: 'third',
      workspaceId: ws,
      title: null,
      choice: {
        agent: 'claude',
        model: 'Opus 5.5',
        effort: 'high',
        fast: false,
      },
      createdAt: FAKE_TIME,
      closedAt: null,
      activeTurnId: null,
      activeTurnStartedAt: null,
      retryMessageId: null,
      startedBy: senderSnapshot(fakeUser),
      sourceSessionId: null,
      loginAvailable: true,
      loginShared: true,
    }
    chat.server.json(
      'POST',
      sessionsPath(org, ws),
      { session: fresh, eventNumber: 0 },
      201,
    )
    chat.server.json('GET', chatHistoryPath(org, ws, 'third'), {
      events: [],
      throughEventNumber: 0,
    })
    await chat.controller.newSession()
    expect(await chat.bodies('POST', sessionsPath(org, ws))).toEqual([
      {
        choice: {
          agent: 'claude',
          model: 'Opus 5.5',
          effort: 'high',
          fast: false,
        },
      },
    ])
    expect(chat.controller.getSnapshot().activeSessionId).toBe('third')
    const views = await chat.bodies('PUT', workspaceViewPath(org, ws))
    expect(views.at(-1)).toEqual({
      tabs: [
        { kind: 'session', sessionId: 'autocomplete' },
        { kind: 'session', sessionId: 'third' },
      ],
      activeTab: { kind: 'session', sessionId: 'third' },
      temporaryTab: null,
      fileList: 'changes',
      tool: 'terminal',
    })
  })

  it('asks before it closes a running session, and Stop and close stops the turn', async () => {
    const chat = chatFor({ conversation: 'running' })
    await chat.controller.start()
    const close = sessionPaths.close(org, ws, 'autocomplete')
    await chat.controller.requestClose('autocomplete')
    expect(chat.controller.getSnapshot().overlay).toEqual({
      kind: 'close',
      sessionId: 'autocomplete',
    })
    chat.controller.dismissOverlay()
    expect(chat.requests('POST', close)).toHaveLength(0)
    const [running] = chat.controller.getSnapshot().sessions
    chat.server.json('POST', close, {
      session: { ...running, closedAt: FAKE_TIME + 1 },
      eventNumber: chat.nextEventNumber(),
    })
    await chat.controller.requestClose('autocomplete')
    await chat.controller.confirmClose()
    expect(await chat.bodies('POST', close)).toEqual([
      { stopRunningTurn: true },
    ])
    const snapshot = chat.controller.getSnapshot()
    expect(snapshot.sessions.map((session) => session.id)).toEqual(['debounce'])
    expect(snapshot.history[0].id).toBe('autocomplete')
    expect(snapshot.activeSessionId).toBe('debounce')
  })
})
