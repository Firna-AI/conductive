import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { chatHistoryPath } from '../../shared/events'
import {
  retryMessagePath,
  sessionPaths,
  type Session,
} from '../../shared/sessions'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import type { RecordedChatScenario } from '../../test-support/recorded-chat'
import { record, text } from '../api/json'
import { now, textOf } from '../components/render-kit'
import { SessionChat } from '../components/SessionChat'
import {
  acceptedIn,
  LINKED,
  linkedRecord,
  loginGone,
  opensLinked,
  withSessions,
} from './linked-kit'
import { chatFor, shown } from './test-kit'

const org = FAKE_IDS.org
const ws = FAKE_IDS.workspace
const first = FAKE_IDS.session
const words = 'Show a loading state under the address line.'
const shortly = { timeout: 10_000 }
const isSend = (request: Request) =>
  request.method === 'POST' && request.url.endsWith('/messages')

type Chat = ReturnType<typeof chatFor>
type Answer = (request: Request) => Promise<Response | null>

/**
 * The chat of Priya, a member, in sessions that Cal started, whose login is
 * not available. Each Send and Try again opens the linked session, unless
 * `wrap` answers otherwise.
 */
function memberChat(
  options: {
    conversation?: RecordedChatScenario
    change?: (session: Session) => Session
    hold?: (request: Request) => boolean
    wrap?: (opens: Answer) => Answer
  } = {},
) {
  let answer: Answer = async () => null
  const chat = chatFor({
    role: 'member',
    conversation: options.conversation ?? 'history',
    hold: options.hold,
    answer: (request) => answer(request),
  })
  withSessions(chat.server, options.change ?? loginGone)
  const opens = opensLinked(chat.server)
  answer = options.wrap?.(opens) ?? opens
  return chat
}

const snapshot = (chat: Chat) => chat.controller.getSnapshot()
const pendingIn = (chat: Chat, sessionId: string) =>
  (snapshot(chat).sessionStates[sessionId]?.pending ?? []).map(
    (message) => message.text,
  )

/** The Worker's events after it opened the linked session with the message. */
function streamLinked(chat: Chat, more: Partial<Session> = {}) {
  chat.emit({ type: 'session.updated', session: linkedRecord(more) })
  chat.emit({
    type: 'message.accepted',
    message: acceptedIn(LINKED, 'client-1', words),
  })
}

async function sendThatWaits(chat: Chat) {
  await chat.controller.start()
  chat.controller.setDraft(first, words)
  const sending = chat.controller.send(first)
  await vi.waitFor(() => expect(chat.held).toHaveLength(1), shortly)
  return async () => {
    chat.held.splice(0, 1)[0]()
    await sending
  }
}

describe('a reply that names a linked session', () => {
  it('shows the linked session and its message once when the reply comes before the stream', async () => {
    const chat = memberChat()
    await chat.controller.start()
    chat.controller.setDraft(first, words)
    await chat.controller.send(first)
    expect(snapshot(chat).activeSessionId).toBe(LINKED)
    expect(pendingIn(chat, LINKED)).toEqual([words])
    expect(pendingIn(chat, first)).toEqual([])
    expect(chat.draftOf(first)?.text).toBe('')
    expect(chat.histories(LINKED)).toBe(1)
    streamLinked(chat)
    expect(shown(chat.controller, LINKED)).toEqual([`user: ${words}`])
    expect(pendingIn(chat, LINKED)).toEqual([])
  })

  it('keeps a newer stream record, and moves the focus at the reply, when the stream comes first', async () => {
    const chat = memberChat({ hold: isSend })
    const reply = await sendThatWaits(chat)
    streamLinked(chat, { title: 'Loading state' })
    expect(snapshot(chat).activeSessionId).toBe(first)
    await reply()
    const linked = snapshot(chat).sessions.find((item) => item.id === LINKED)
    expect(linked?.title).toBe('Loading state')
    expect(snapshot(chat).activeSessionId).toBe(LINKED)
    expect(shown(chat.controller, LINKED)).toEqual([`user: ${words}`])
    expect(pendingIn(chat, LINKED)).toEqual([])
  })

  it('leaves the shown tab and the new text where the user put them during the send', async () => {
    const chat = memberChat({ hold: isSend })
    const reply = await sendThatWaits(chat)
    await chat.controller.select('debounce')
    chat.controller.setDraft(first, 'Also the error state.')
    await reply()
    expect(snapshot(chat).activeSessionId).toBe('debounce')
    expect(snapshot(chat).sessions.map((item) => item.id)).toContain(LINKED)
    expect(pendingIn(chat, LINKED)).toEqual([words])
    expect(chat.draftOf(first)?.text).toBe('Also the error state.')
  })

  it('sends again with the same ID after a lost reply, and keeps one linked session and one message', async () => {
    let sends = 0
    const chat = memberChat({
      wrap: (opens) => async (request) => {
        if (!isSend(request)) return opens(request)
        sends += 1
        if (sends > 1) return opens(request)
        const error = { code: 'internal_error', message: 'Try again.' }
        return Response.json({ error }, { status: 500 })
      },
    })
    await chat.controller.start()
    chat.controller.setDraft(first, words)
    await chat.controller.send(first)
    expect(snapshot(chat).notice?.title).toBe("Your message didn't send")
    // The Worker took the message before its reply got lost.
    streamLinked(chat)
    await chat.controller.send(first)
    const bodies = await chat.bodies(
      'POST',
      sessionPaths.messages(org, ws, first),
    )
    expect(bodies.map((body) => text(record(body).id))).toEqual([
      'client-1',
      'client-1',
    ])
    expect(snapshot(chat).activeSessionId).toBe(LINKED)
    const linked = snapshot(chat).sessions.filter(
      (item) => item.sourceSessionId === first,
    )
    expect(linked.map((item) => item.id)).toEqual([LINKED])
    expect(shown(chat.controller, LINKED)).toEqual([`user: ${words}`])
    expect(pendingIn(chat, LINKED)).toEqual([])
    expect(chat.draftOf(first)?.text).toBe('')
  })

  it('opens the linked session from the reply of Try again', async () => {
    const chat = memberChat({
      conversation: 'failed',
      change: (session) => ({ ...loginGone(session), retryMessageId: 'ask' }),
    })
    await chat.controller.start()
    await chat.controller.retry(first, 'ask')
    expect(
      chat.requests('POST', retryMessagePath(org, ws, first, 'ask')),
    ).toHaveLength(1)
    expect(snapshot(chat).activeSessionId).toBe(LINKED)
    expect(pendingIn(chat, LINKED)).toEqual([workspaceFixtures().message.text])
  })

  it('shows the linked session to another reader in another tab, without moving the focus of that tab', async () => {
    const sender = memberChat()
    const other = chatFor({
      conversation: 'history',
      stream: sender.server.events,
    })
    other.server.json('GET', chatHistoryPath(org, ws, LINKED), {
      events: [],
      throughEventNumber: 0,
    })
    await sender.controller.start()
    await other.controller.start()
    other.controller.setDraft(first, 'Cal types here.')
    sender.controller.setDraft(first, words)
    await sender.controller.send(first)
    streamLinked(sender)
    expect(snapshot(sender).activeSessionId).toBe(LINKED)
    expect(snapshot(other).activeSessionId).toBe(first)
    expect(snapshot(other).sessions.map((item) => item.id)).toContain(LINKED)
    expect(other.draftOf(first)?.text).toBe('Cal types here.')
    expect(shown(other.controller, LINKED)).toEqual([`user: ${words}`])
    await other.controller.select(LINKED)
    const markup = renderToStaticMarkup(
      <SessionChat
        controller={other.controller}
        mobile={false}
        now={now}
        snapshot={snapshot(other)}
      />,
    )
    expect(textOf(markup)).toContain("Uses Priya Raman's Claude login")
  })
})
