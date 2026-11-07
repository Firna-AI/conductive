import { describe, expect, it, vi } from 'vitest'
import type { AgentChoice } from '../../shared/agents'
import { chatHistoryPath } from '../../shared/events'
import type { Session } from '../../shared/sessions'
import { sessionsPath } from '../../shared/sessions'
import { FAKE_IDS, FAKE_TIME, fakeUser } from '../../test-support/fixtures/core'
import { senderSnapshot } from '../../test-support/fixtures/workspaces'
import { recordedChatEvents } from '../../test-support/recorded-chat'
import { chatFor, shown } from './test-kit'

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace
const opus: AgentChoice = { agent: 'claude', model: 'Opus 5.5', effort: 'high' }
const recordedHistory = [
  'user: Add address autocomplete to the checkout form. Keep the manual fields as a fallback.',
  'agent: The checkout form now suggests addresses. Manual entry still works.',
  'tool: src/app/checkout/AddressForm.tsx done',
  'end: 252000',
]
const shortly = { timeout: 10_000 }

function record(id: string, closedAt: number | null): Session {
  return {
    id,
    workspaceId: ws,
    title: 'Places proxy timeouts',
    choice: opus,
    createdAt: FAKE_TIME - 1_000,
    closedAt,
    activeTurnId: null,
    retryMessageId: null,
    startedBy: senderSnapshot(fakeUser),
    sourceSessionId: null,
    loginAvailable: true,
  }
}

describe('session history', () => {
  it('loads the stored history of the session that a close from another tab shows', async () => {
    const chat = chatFor({ conversation: 'history' })
    await chat.controller.start()
    const [first] = chat.controller.getSnapshot().sessions
    chat.emit({
      type: 'session.updated',
      session: { ...first, closedAt: FAKE_TIME + 1 },
    })
    expect(chat.controller.getSnapshot().activeSessionId).toBe('debounce')
    expect(chat.histories('debounce')).toBe(1)
    await vi.waitFor(
      () => expect(shown(chat.controller, 'debounce')).toEqual(recordedHistory),
      shortly,
    )
  })

  it('loads the stored history of a session that another tab opens while no session is open', async () => {
    const chat = chatFor({ conversation: 'history' })
    chat.server.json('GET', sessionsPath(org, ws), {
      sessions: [],
      history: [record('proxy-timeouts', FAKE_TIME)],
    })
    await chat.controller.start()
    expect(chat.controller.getSnapshot().activeSessionId).toBeNull()
    chat.emit({
      type: 'session.updated',
      session: record('proxy-timeouts', null),
    })
    expect(chat.controller.getSnapshot().activeSessionId).toBe('proxy-timeouts')
    expect(chat.histories('proxy-timeouts')).toBe(1)
    await vi.waitFor(
      () =>
        expect(shown(chat.controller, 'proxy-timeouts')).toEqual(
          recordedHistory,
        ),
      shortly,
    )
  })

  it('shares one running history load for each session, also after the chat starts again', async () => {
    const chat = chatFor({ conversation: 'history' })
    await chat.controller.start()
    expect(chat.histories('autocomplete')).toBe(1)
    chat.controller.stop()
    await chat.controller.start()
    expect(chat.histories('autocomplete')).toBe(2)
    const first = chat.controller.select('debounce')
    await chat.controller.select('debounce')
    expect(shown(chat.controller, 'debounce')).toEqual(recordedHistory)
    await first
    expect(chat.histories('debounce')).toBe(1)
  })

  it('tries a failed history again only when the user asks', async () => {
    const chat = chatFor({ conversation: 'history' })
    const history = chatHistoryPath(org, ws, 'debounce')
    chat.server.json(
      'GET',
      history,
      {
        error: {
          code: 'internal_error',
          message: 'The request failed. Try again.',
        },
      },
      500,
    )
    await chat.controller.start()
    await chat.controller.select('debounce')
    const state = () => chat.controller.getSnapshot().sessionStates.debounce
    expect(state().hydration).toBe('failed')
    chat.controller.setDraft('debounce', 'Hello')
    chat.emit({ type: 'workspace.title', name: 'Checkout' })
    expect(chat.histories('debounce')).toBe(1)
    const events = recordedChatEvents('history', ws, 'debounce')
    chat.server.json('GET', history, {
      events,
      throughEventNumber: events.length,
    })
    await chat.controller.loadHistory('debounce')
    expect(chat.histories('debounce')).toBe(2)
    expect(shown(chat.controller, 'debounce')).toEqual(recordedHistory)
  })
})
