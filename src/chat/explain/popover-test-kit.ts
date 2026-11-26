import type { Session } from '../../shared/generated/Session'
import type { UserMessage } from '../../shared/generated/UserMessage'
import type { WorkspaceEvent } from '../../shared/events'
import type { SendMessageResponse } from '../../shared/messages'
import type { FakeApiServer } from '../../test-support/fake-api'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { press, typeText, waitFor } from '../../test-support/mount'
import { anchorOf, explanation, recordEvent } from './explain-test-kit'

// The explanations that the DOM tests of the popover open: their records
// and their chats in the history of the fake, the press on a mark that
// opens a popover, a follow-up, and the replies of the Worker.

/** The number of the next event of the fake. */
export const nextEvent = (server: FakeApiServer) =>
  server.events.history(Number.MAX_SAFE_INTEGER).throughEventNumber + 1

/** Types a follow-up in the popover and sends it. */
export async function sendFollowUp(popover: HTMLElement, text: string) {
  await typeText(byRole('textbox', 'Follow-up', popover), text)
  await press(byRole('button', 'Send', popover))
}

/** The answer of each explanation of the tests. */
export const explanationAnswer =
  'When the places proxy finds no address, the fields stay empty and editable.'

/** When the first turn of each explanation of the tests starts. */
export const explanationStart = FAKE_TIME + 61_000

/**
 * Opens the popover of an explanation from the button at the end of its
 * mark, whose label names the state of the explanation, such as "Ready".
 */
export async function openFromMark(
  title: string,
  state: string,
): Promise<HTMLElement> {
  const mark = await waitFor(
    () => queryByRole('button', `${title}, ${state}`),
    'the mark of the explanation',
  )
  await press(mark)
  return byRole('dialog', title)
}

/**
 * An explanation of a quote of the recorded answer, with its written
 * prompt and its answer. Its turn runs with `running`, and its tab is
 * closed with `closed`. With `failed`, its turn failed with no answer, and
 * its record names the prompt for Try again.
 */
export function explained(
  id: string,
  quote: string,
  options: { running?: boolean; failed?: boolean; closed?: boolean } = {},
): { record: Session; prompt: UserMessage; events: WorkspaceEvent[] } {
  const ask = workspaceFixtures().message
  const turn = { sessionId: id, turnId: `turn-${id}` }
  const startedAt = explanationStart
  const prompt: UserMessage = {
    ...ask,
    id: `prompt-${id}`,
    sessionId: id,
    text: `Explain "${quote}"\n\nKeep the answer short.`,
  }
  const record = explanation(id, anchorOf(quote), {
    activeTurnId: options.running ? turn.turnId : null,
    activeTurnStartedAt: options.running ? startedAt : null,
    retryMessageId: options.failed ? prompt.id : null,
    closedAt: options.closed ? FAKE_TIME + 90_000 : null,
  })
  const answer: WorkspaceEvent = {
    ...turn,
    type: 'assistant.completed',
    messageId: `answer-${id}`,
    text: explanationAnswer,
    userMessageIds: [prompt.id],
  }
  const completed: WorkspaceEvent = {
    ...turn,
    type: 'turn.completed',
    state: 'finished',
    durationMs: 14_000,
    userMessageIds: [prompt.id],
    files: [],
    omittedFileCount: 0,
  }
  const failed: WorkspaceEvent = {
    ...turn,
    type: 'turn.failed',
    error: { code: 'agent_unavailable', message: 'The agent is busy.' },
    retryMessageId: prompt.id,
    durationMs: 1_000,
  }
  const work = options.running
    ? [answer]
    : options.failed
      ? [failed]
      : [answer, completed]
  return {
    record,
    prompt,
    events: [
      { type: 'message.accepted', message: prompt },
      {
        ...turn,
        type: 'turn.started',
        senderId: ask.sender.id,
        choice: ask.choice,
        startedAt,
        messageIds: [prompt.id],
      },
      ...work,
      recordEvent(record),
    ],
  }
}

/**
 * The record of a linked session that the Worker opened from `source`,
 * because the login of `source` cannot take the message of the member.
 */
export function linkedFrom(source: Session, title: string): Session {
  return {
    ...source,
    id: 'linked-1',
    title,
    anchor: null,
    retryMessageId: null,
    sourceSessionId: source.id,
  }
}

/**
 * The reply of the Worker to a follow-up that `session` took, for the
 * message of the request.
 */
export async function followUpReply(
  request: Request,
  session: Session,
  eventNumber: number,
): Promise<SendMessageResponse> {
  const body: unknown = await request.json()
  const sent = typeof body === 'object' && body !== null ? body : {}
  const ask = workspaceFixtures().message
  return {
    eventNumber,
    session,
    turnId: session.activeTurnId,
    message: {
      ...ask,
      id: 'id' in sent && typeof sent.id === 'string' ? sent.id : 'follow-up',
      sessionId: session.id,
      text: 'text' in sent && typeof sent.text === 'string' ? sent.text : '',
      state: 'sent',
    },
  }
}
