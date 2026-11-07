import type { AgentChoice } from '../../shared/agents'
import { chatHistoryPath } from '../../shared/events'
import type { SendMessageResponse, UserMessage } from '../../shared/messages'
import { sessionsPath, type Session } from '../../shared/sessions'
import type { FakeApiServer } from '../../test-support/fake-api'
import {
  FAKE_IDS,
  FAKE_TIME,
  fakeUsers,
} from '../../test-support/fixtures/core'
import {
  senderSnapshot,
  workspaceFixtures,
} from '../../test-support/fixtures/workspaces'
import { record, text } from '../api/json'
import { newSessionRecord } from './test-kit'

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace

/** Priya, the member who is not an admin, who reads the member role. */
export const priya = senderSnapshot(fakeUsers[1])

export const opus: AgentChoice = {
  agent: 'claude',
  model: 'Opus 5.5',
  effort: 'high',
}

/** The ID of the linked session that the fake opens. */
export const LINKED = 'linked-1'

/** The linked session that a message of Priya opened from the first session. */
export function linkedRecord(more: Partial<Session> = {}): Session {
  return newSessionRecord(LINKED, opus, null, {
    startedBy: priya,
    sourceSessionId: FAKE_IDS.session,
    ...more,
  })
}

/** A message of Priya that a session took. */
export function acceptedIn(
  sessionId: string,
  id: string,
  words: string,
): UserMessage {
  return {
    id,
    sessionId,
    sender: priya,
    text: words,
    attachments: [],
    choice: opus,
    createdAt: FAKE_TIME,
    state: 'sent',
  }
}

/** Writes the open sessions of the fake, each one changed by `change`. */
export function withSessions(
  server: FakeApiServer,
  change: (session: Session) => Session,
): void {
  const { sessions } = workspaceFixtures()
  server.json('GET', sessionsPath(org, ws), {
    sessions: sessions.sessions.map(change),
    history: sessions.history,
  })
}

/** The login of the starter of a session is not available. */
export const loginGone = (session: Session): Session => ({
  ...session,
  loginAvailable: false,
})

/**
 * Answers each Send and Try again as the Worker does when the login of the
 * starter is not available: a new linked session takes the message, and the
 * reply names it with its record. A retry sends the message of the fixture
 * again as `retry-1`. The linked session has an empty history.
 */
export function opensLinked(server: FakeApiServer) {
  server.json('GET', chatHistoryPath(org, ws, LINKED), {
    events: [],
    throughEventNumber: 0,
  })
  return async (request: Request): Promise<Response | null> => {
    const path = new URL(request.url).pathname
    const retry = path.endsWith('/retry')
    if (request.method !== 'POST' || (!retry && !path.endsWith('/messages'))) {
      return null
    }
    const body = retry ? null : record(await request.json())
    const message = body
      ? acceptedIn(LINKED, text(body.id), text(body.text))
      : acceptedIn(LINKED, 'retry-1', workspaceFixtures().message.text)
    const reply: SendMessageResponse = {
      message,
      turnId: 'turn-9',
      session: linkedRecord(),
    }
    return Response.json(reply, { status: 202 })
  }
}
