// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import {
  chatHistoryPath,
  type WorkspaceEvent,
  type WorkspaceEventEnvelope,
} from '../../shared/events'
import {
  secretRequestsPath,
  type SecretRequestsResponse,
} from '../../shared/secret-requests'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  asks,
  cal,
  second,
  step,
} from '../../test-support/fixtures/secret-requests'
import { secretTurn } from '../../test-support/fixtures/secret-turn'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { sessionMarkup, textOf } from '../components/render-kit'
import type { ChatController } from '../state/controller'
import { chatFor } from '../state/test-kit'
import { answerPathOf, cardsOf, lateRequest, updated } from './secret-test-kit'

const { org, workspace, session } = FAKE_IDS
const shortly = { timeout: 10_000 }
/** The secret turn starts here, and a newer turn of Cal follows it. */
const start = FAKE_TIME + 20 * second
const newer = start + 60 * second
/** The stored history ends here, after every recorded event of the fake. */
const through = 1_000

/** A newer turn of Cal: his message, its start, the answer, and its end. */
function newerTurn(at: number): [WorkspaceEvent, number][] {
  const turnId = 'turn-newer'
  const { message } = workspaceFixtures()
  const sent = {
    ...message,
    id: 'newer-message',
    sessionId: session,
    text: 'Check the postcode rules again.',
    createdAt: at,
  }
  const answer = 'The postcode rules hold.'
  return [
    [{ type: 'message.accepted', message: sent }, at],
    [
      {
        type: 'turn.started',
        sessionId: session,
        turnId,
        senderId: cal.id,
        choice: message.choice,
        startedAt: at + step,
        messageIds: [sent.id],
      },
      at + step,
    ],
    [
      {
        type: 'assistant.completed',
        sessionId: session,
        turnId,
        messageId: 'newer-answer',
        text: answer,
        userMessageIds: [sent.id],
      },
      at + 2 * step,
    ],
    [
      {
        type: 'turn.completed',
        sessionId: session,
        turnId,
        state: 'finished',
        durationMs: 2 * step,
        userMessageIds: [sent.id],
        files: [],
        omittedFileCount: 0,
      },
      at + 3 * step,
    ],
  ]
}

/** The events of a history page, numbered from `first`. */
function pageOf(
  events: readonly [WorkspaceEvent, number][],
  first: number,
): WorkspaceEventEnvelope[] {
  return events.map(([event, occurredAt], index) => ({
    workspaceId: workspace,
    eventNumber: first + index,
    occurredAt,
    event,
  }))
}

/** The open session of the chat as a page of elements. */
function pageOfChat(controller: ChatController): HTMLElement {
  const page = document.createElement('div')
  page.innerHTML = sessionMarkup(controller)
  return page
}

describe('the place of an answered request while the history of its session loads', () => {
  test('a late request of an earlier page shows nowhere after its answer until its turn loads, and then at its place in its turn', async () => {
    const open = lateRequest('old', start + 300, asks.database.reason)
    const earlier = pageOf(secretTurn(start, [updated(open)]), 1)
    const newest = pageOf(newerTurn(newer), earlier.length + 1)
    const chat = chatFor({
      hold: (request) => new URL(request.url).searchParams.has('before'),
    })
    chat.server.json('GET', chatHistoryPath(org, workspace, session), {
      events: newest,
      throughEventNumber: through,
      hasMore: true,
      nextBeforeEventNumber: newest[0].eventNumber,
    })
    chat.server.json(
      'GET',
      chatHistoryPath(org, workspace, session, newest[0].eventNumber, through),
      { events: earlier, throughEventNumber: through },
    )
    chat.server.json('GET', secretRequestsPath(org, workspace), {
      requests: [open],
      workspaceValues: [],
    } satisfies SecretRequestsResponse)
    chat.server.json('POST', answerPathOf(open), {
      request: {
        ...open,
        state: 'denied',
        answeredBy: cal,
        updatedAt: newer + 10 * second,
      },
    })
    await chat.controller.start()
    await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
    const asked = cardsOf(pageOfChat(chat.controller))
    await chat.controller.answerSecret(open.id, { kind: 'deny' })
    const held = cardsOf(pageOfChat(chat.controller))
    const complete = chat.controller.loadHistory(session)
    chat.held.splice(0, 1)[0]()
    await complete
    const page = pageOfChat(chat.controller)
    expect({
      asked,
      held,
      loaded: cardsOf(page),
      text: textOf(page.innerHTML),
    }).toEqual({
      asked: ['Request for PROD_DATABASE_URL (above the composer)'],
      held: [],
      loaded: ['Request for PROD_DATABASE_URL'],
      // The card follows the message of its turn, before the newer turn.
      text: expect.stringMatching(
        /check the addresses that failed\..* PROD_DATABASE_URL Denied .*Check the postcode rules again\./,
      ),
    })
    chat.controller.stop()
  })
})
