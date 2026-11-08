import { describe, expect, it } from 'vitest'
import type { AgentChoice } from '../../shared/agents'
import { chatHistoryPath } from '../../shared/events'
import { sessionsPath } from '../../shared/sessions'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { chatFor, newSessionRecord } from './test-kit'

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace
const id = 'debounce'
const opus: AgentChoice = { agent: 'claude', model: 'Opus 5.5', effort: 'high' }

describe('session records from stored history', () => {
  it('keeps both first-load lists complete when history publishes the shown record first', async () => {
    const chat = chatFor({ conversation: 'history' })
    const first = newSessionRecord(FAKE_IDS.session, opus)
    const second = newSessionRecord(id, opus)
    const closed = newSessionRecord('closed', opus, FAKE_TIME)
    chat.server.json('GET', sessionsPath(org, ws), {
      eventNumber: 0,
      sessions: [first, second],
      history: [closed],
    })
    const newest = { ...first, title: 'Title from first history' }
    const eventNumber = chat.nextEventNumber()
    chat.server.json('GET', chatHistoryPath(org, ws, first.id), {
      events: [
        {
          workspaceId: ws,
          eventNumber,
          occurredAt: FAKE_TIME,
          event: { type: 'session.updated', session: newest },
        },
      ],
      throughEventNumber: eventNumber,
    })
    await chat.controller.start()
    const snapshot = chat.controller.getSnapshot()
    expect(snapshot.sessions).toEqual([newest, second])
    expect(snapshot.history).toEqual([closed])
    expect(snapshot.activeSessionId).toBe(first.id)
    expect(snapshot.load).toEqual({ state: 'ready' })
  })

  it.each(['ready', 'failed'] as const)(
    'shows a newer history record when the history ends as %s, before its socket copy',
    async (hydration) => {
      const chat = chatFor({ conversation: 'history' })
      await chat.controller.start()
      const session = chat.controller
        .getSnapshot()
        .sessions.find((item) => item.id === id)
      if (!session) throw new Error('The second session did not load.')
      const eventNumber = chat.nextEventNumber()
      const envelope = {
        workspaceId: ws,
        eventNumber,
        occurredAt: FAKE_TIME,
        event: {
          type: 'session.updated' as const,
          session: { ...session, title: 'New history title' },
        },
      }
      chat.server.json('GET', chatHistoryPath(org, ws, id), {
        events: [envelope],
        throughEventNumber: eventNumber + 1,
        ...(hydration === 'failed'
          ? { hasMore: true, nextAfterEventNumber: eventNumber }
          : {}),
      })
      chat.server.json(
        'GET',
        chatHistoryPath(org, ws, id, eventNumber, eventNumber + 1),
        {
          error: {
            code: 'internal_error',
            message: 'The request failed. Try again.',
          },
        },
        500,
      )
      await chat.controller.select(id)
      const title = () =>
        chat.controller.getSnapshot().sessions.find((item) => item.id === id)
          ?.title
      expect(title()).toBe('New history title')
      expect(chat.controller.getSnapshot().sessionStates[id].hydration).toBe(
        hydration,
      )
      chat.server.events.emit(envelope)
      expect(title()).toBe('New history title')
      expect(chat.controller.getSnapshot().activeSessionId).toBe(id)
    },
  )
})
