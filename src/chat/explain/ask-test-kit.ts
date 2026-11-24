import { act } from 'react'
import type { SendMessageResponse } from '../../shared/messages'
import { explainSessionPath } from '../../shared/sessions'
import type { FakeApiServer } from '../../test-support/fake-api'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { press, waitFor } from '../../test-support/mount'
import {
  anchorOf,
  answer,
  explanation,
  selectText,
  textNodeWith,
} from './explain-test-kit'
import { nextEvent } from './popover-test-kit'
import { messageAttributes } from './selection'

// The helpers of the DOM tests of Ask: the starts that the fake answers,
// the unsent popover from a selection of the recorded answer, and a press
// outside it.

const { org, workspace, session } = FAKE_IDS

/** The route of a start in the parent session of the recorded chat. */
export const explainPath = explainSessionPath(org, workspace, session)

/** The quote of each Ask of the tests, in the recorded answer. */
export const askQuote = 'Manual entry still works'

/** The question of each Ask of the tests, which titles its explanation. */
export const question = 'Does manual entry still fill the city?'

/** The body of the start of each Ask of the tests: the quote and the question. */
export const askBody = {
  messageId: answer.messageId,
  quote: askQuote,
  before: 'The checkout form now suggests addresses. ',
  after: '.',
  question,
}

/**
 * The reply of the Worker to the start of an Ask: the new open session,
 * whose title is the question, and its written prompt.
 */
function askStarted(eventNumber: number): SendMessageResponse {
  const record = explanation('ask-new', anchorOf(askQuote), {
    title: question,
    activeTurnId: 'turn-ask',
  })
  const sent = workspaceFixtures().message
  return {
    eventNumber,
    session: record,
    turnId: 'turn-ask',
    message: {
      id: 'prompt-ask',
      sessionId: record.id,
      sender: sent.sender,
      text: `${question}\n\nKeep the answer short.`,
      attachments: [],
      choice: record.choice,
      createdAt: FAKE_TIME + 120_000,
      state: 'queued',
    },
  }
}

/** How the fake answers one start: after `waits`, it starts or refuses. */
export interface StartOutcome {
  waits?: Promise<void>
  starts: boolean
}

/**
 * Answers the starts of the parent session in their order, as the Worker
 * does: the reply of a started Ask, or a refusal with 409, as for a member
 * without a login.
 */
export function answerStarts(
  fake: FakeApiServer,
  outcomes: readonly StartOutcome[],
): void {
  let next = 0
  fake.handle('POST', explainPath, async () => {
    const outcome = outcomes[next]
    next += 1
    if (!outcome) throw new Error('The test expects no more starts.')
    await outcome.waits
    if (outcome.starts) {
      return Response.json(askStarted(nextEvent(fake)), { status: 201 })
    }
    const error = { code: 'agent_login_required', message: 'Connect a login.' }
    return Response.json({ error }, { status: 409 })
  })
}

/** The bodies of the starts that the fake took, in their order. */
export function startBodies(server: FakeApiServer): Promise<unknown[]> {
  const sent = server.requests.filter(
    (request) => new URL(request.url).pathname === explainPath,
  )
  return Promise.all(sent.map((request) => request.json()))
}

/**
 * Selects the quote in the recorded answer, and gives Ask by it. The text
 * of the quote lies in one text node also when a mark splits the answer.
 */
export async function selectQuote(): Promise<HTMLElement> {
  const text = await waitFor(() => {
    const shown = queryAnswer()
    return shown && textNodeWith(shown, askQuote)
  }, 'the quote in the recorded answer')
  await selectText(text, askQuote)
  return waitFor(() => queryByRole('button', 'Ask'), 'Ask by the selection')
}

/** Selects the quote, presses Ask, and gives the unsent popover. */
export async function openAsk(): Promise<HTMLElement> {
  await press(await selectQuote())
  return byRole('dialog', 'Ask')
}

/** The field of the question in the unsent popover. */
export function questionField(popover: HTMLElement): HTMLElement {
  return byRole('textbox', 'Question', popover)
}

/** The element of the recorded answer in the parent chat, if it shows. */
function queryAnswer(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[${messageAttributes.message}="${answer.messageId}"]`,
  )
}

/** The element of the recorded answer in the parent chat. */
export function parentAnswer(): HTMLElement {
  const element = queryAnswer()
  if (!element) throw new Error('The chat shows no recorded answer.')
  return element
}

/** Presses the pointer on `target`, as a mouse does. */
export async function pointerDown(target: EventTarget): Promise<void> {
  await act(async () => {
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  })
}
