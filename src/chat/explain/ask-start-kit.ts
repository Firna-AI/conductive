import { act } from 'react'
import { flushMicrotasks } from '../../app/test-kit'
import type { WorkspaceEvent } from '../../shared/events'
import type { SendMessageResponse } from '../../shared/messages'
import { explainSessionPath } from '../../shared/sessions'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { record, text } from '../api/json'
import { storeEvents } from '../secrets/secret-test-kit'
import { askQuote, question } from './ask-test-kit'
import { anchorOf, explanation, recordEvent } from './explain-test-kit'
import { nextEvent } from './popover-test-kit'

// The starts of an Ask that the fake answers in the DOM tests: the stream
// events of a start that the Worker takes, the reply, and the bodies that
// the app sent.

const { org, workspace, session } = FAKE_IDS

/** The route of a start in the parent session of the recorded chat. */
const explainPath = explainSessionPath(org, workspace, session)

/**
 * The reply of the Worker to the start of an Ask: the new open session,
 * whose title is the question, and its written prompt, whose ID is the
 * `promptId` of the request.
 */
function askStarted(
  eventNumber: number,
  promptId: string,
): SendMessageResponse {
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
      id: promptId,
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

/**
 * Shows a start of an Ask in the stream, as the Worker does before its
 * reply: the record of the new session, then its written prompt. Gives the
 * reply of the start.
 */
export function streamStart(
  fake: FakeApiServer,
  promptId: string,
): SendMessageResponse {
  const reply = askStarted(nextEvent(fake), promptId)
  const at = FAKE_TIME + 120_000
  storeEvents(fake, [
    [recordEvent(reply.session), at],
    [{ type: 'message.accepted', message: reply.message }, at],
  ])
  return reply
}

/**
 * Shows in the stream that the cloud computer starts, as after a start of an
 * Ask in a workspace whose cloud computer was stopped.
 */
export function streamComputerStart(fake: FakeApiServer): void {
  const { workspace } = workspaceFixtures('starting').detail
  const event: WorkspaceEvent = { type: 'workspace.updated', workspace }
  storeEvents(fake, [[event, FAKE_TIME + 130_000]])
}

/**
 * How the fake answers one start. The Worker takes the start, or refuses
 * it, after `accepts` settles. A start that it takes shows in the stream
 * before the reply, as `streamStart` says. The reply comes after `replies`
 * settles.
 */
export interface StartOutcome {
  accepts?: Promise<void>
  replies?: Promise<void>
  /**
   * `started`: the reply of the start. `replied`: the reply of the start,
   * before the stream shows it. `lost`: the Worker takes the start, but its
   * reply is a server error. `refused`: a refusal with 409, as for a member
   * without a login. `failed`: a server error, and the stream shows no
   * start.
   */
  ends: 'started' | 'replied' | 'lost' | 'refused' | 'failed'
}

/**
 * Answers the starts of a parent session in their order, as `StartOutcome`
 * says: by default, the session of the recorded chat.
 */
export function answerStarts(
  fake: FakeApiServer,
  outcomes: readonly StartOutcome[],
  parentId: string = session,
): void {
  let next = 0
  const path = explainSessionPath(org, workspace, parentId)
  fake.handle('POST', path, async (request) => {
    const outcome = outcomes[next]
    next += 1
    if (!outcome) throw new Error('The test expects no more starts.')
    const promptId = text(record(await request.json()).promptId)
    await outcome.accepts
    const taken = outcome.ends === 'started' || outcome.ends === 'lost'
    const reply = taken ? streamStart(fake, promptId) : null
    await outcome.replies
    if (outcome.ends === 'started') return Response.json(reply, { status: 201 })
    if (outcome.ends === 'replied') {
      const unseen = askStarted(nextEvent(fake), promptId)
      return Response.json(unseen, { status: 201 })
    }
    if (outcome.ends === 'refused') {
      const error = {
        code: 'agent_login_required',
        message: 'Connect a login.',
      }
      return Response.json({ error }, { status: 409 })
    }
    const error = { code: 'internal', message: 'The request failed.' }
    return Response.json({ error }, { status: 500 })
  })
}

/** The starts that the fake took, in their order. Each read takes a copy. */
async function sentStarts(
  server: FakeApiServer,
): Promise<Record<string, unknown>[]> {
  const sent = server.requests.filter(
    (request) => new URL(request.url).pathname === explainPath,
  )
  const bodies: unknown[] = await Promise.all(
    sent.map((request) => request.clone().json()),
  )
  return bodies.map((body) => record(body))
}

/**
 * The bodies of the starts that the fake took, in their order, without the
 * prompt IDs, which the app chooses. `startPromptIds` gives those.
 */
export async function startBodies(server: FakeApiServer): Promise<unknown[]> {
  return (await sentStarts(server)).map((body) =>
    Object.fromEntries(
      Object.entries(body).filter(([key]) => key !== 'promptId'),
    ),
  )
}

/** The prompt IDs of the starts that the fake took, in their order. */
export async function startPromptIds(server: FakeApiServer): Promise<string[]> {
  return (await sentStarts(server)).map((body) => text(body.promptId))
}

/** Lets the replies of the fake, and the renders that they start, end. */
export async function settleReplies(): Promise<void> {
  await act(async () => {
    await flushMicrotasks()
  })
}
