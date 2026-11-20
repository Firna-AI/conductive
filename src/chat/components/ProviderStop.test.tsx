import { describe, expect, it } from 'vitest'
import type { Session } from '../../shared/generated/Session'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import type { RecordedChatScenario } from '../../test-support/recorded-chat'
import { withSessions } from '../state/linked-kit'
import { turn } from './event-kit'
import { renderChat } from './render-kit'

const continues = 'The agent continues when the cloud computer starts again'
const stopLines = /The cloud computer stopped|The agent stopped/g
const afterLines =
  /The agent continues when the cloud computer starts again|The agent can continue after [^.]+? again|Send a message to continue/g

/** The stopped lines and the lines after a stop, in the order of the chat. */
function linesOf(text: string) {
  return {
    stops: text.match(stopLines) ?? [],
    after: text.match(afterLines) ?? [],
  }
}

/** Whether every part shows in the text, each after the one before it. */
function inOrder(text: string, parts: readonly string[]): boolean {
  const places = parts.map((part) => text.indexOf(part))
  return places.every((place, index) => place > (places[index - 1] ?? -1))
}

/** The session keeps the org login of Acme. */
const onOrgLogin = (session: Session): Session => ({
  ...session,
  login: { type: 'org', orgId: FAKE_IDS.org },
  loginAvailable: false,
})

describe('the lines of a provider stop', () => {
  it('names the cloud computer on the stopped line, and starts the continuation turn at the line under it', async () => {
    const { text } = await renderChat({
      conversation: 'cloud-computer-continued',
    })
    const shown = text()
    expect(linesOf(shown)).toEqual({
      stops: ['The cloud computer stopped'],
      after: [continues],
    })
    expect(
      inOrder(shown, [
        'Ran npm test Stopped',
        'The cloud computer stopped',
        continues,
        '1 tool call, 1 message',
        'Done. The checkout form suggests addresses',
        '2m 38s',
      ]),
    ).toBe(true)
  })

  it('puts the work of the continuation turn between the line and a message that waits for a later turn', async () => {
    const { chat, text } = await renderChat({ conversation: 'running' })
    const next = { ...turn, turnId: 'turn-2' }
    const { message } = workspaceFixtures()
    chat.emit({
      ...turn,
      type: 'turn.completed',
      state: 'stopped',
      endReason: 'cloud_computer_stopped',
      durationMs: 0,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [message.id],
    })
    chat.emit({
      type: 'turn.continued',
      sessionId: turn.sessionId,
      previousTurnId: turn.turnId,
      next: 'turn',
      turnId: next.turnId,
    })
    chat.emit({
      type: 'message.accepted',
      message: {
        ...message,
        id: 'later',
        text: 'Then add tests for the form.',
        state: 'queued',
      },
    })
    chat.emit({
      ...next,
      type: 'turn.started',
      senderId: message.sender.id,
      choice: message.choice,
      startedAt: FAKE_TIME + 600_000,
      messageIds: ['continuation:turn-1'],
    })
    chat.emit({
      ...next,
      type: 'assistant.completed',
      messageId: 'again',
      text: 'The tests pass again.',
      userMessageIds: [],
    })
    expect(
      inOrder(text(), [
        'The cloud computer stopped',
        continues,
        'The tests pass again.',
        'Then add tests for the form.',
      ]),
    ).toBe(true)
  })

  it('keeps the line right under the stopped line, above a message that a member sent after the stop', async () => {
    const { chat, text } = await renderChat({ conversation: 'running' })
    const { message } = workspaceFixtures()
    chat.emit({
      type: 'message.accepted',
      message: {
        ...message,
        id: 'window',
        text: 'Also check the postcode.',
        state: 'queued',
      },
    })
    chat.emit({
      ...turn,
      type: 'turn.completed',
      state: 'stopped',
      endReason: 'cloud_computer_stopped',
      durationMs: 0,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [message.id],
    })
    chat.emit({
      type: 'turn.continued',
      sessionId: turn.sessionId,
      previousTurnId: turn.turnId,
      next: 'turn',
      turnId: 'turn-2',
    })
    expect(
      inOrder(text(), [
        'The cloud computer stopped',
        continues,
        'Also check the postcode.',
      ]),
    ).toBe(true)
  })

  it.each<{
    name: string
    conversation: RecordedChatScenario
    role?: 'member'
    sessions?: (session: Session) => Session
    after: string[]
  }>([
    {
      name: 'says you to the starter whose login is gone',
      conversation: 'cloud-computer-login-gone',
      after: ['The agent can continue after you connect Claude again'],
    },
    {
      name: 'names the starter to another member',
      conversation: 'cloud-computer-login-gone',
      role: 'member',
      after: ['The agent can continue after Cal connects Claude again'],
    },
    {
      name: 'names an admin for the org login',
      conversation: 'cloud-computer-login-gone',
      role: 'member',
      sessions: onOrgLogin,
      after: [
        "The agent can continue after an admin connects Acme's Claude login again",
      ],
    },
    {
      name: 'asks for a message when the continuation turn stopped again',
      conversation: 'cloud-computer-stopped-again',
      after: [continues, 'Send a message to continue'],
    },
  ])('$name', async ({ conversation, role, sessions, after }) => {
    const { text } = await renderChat({
      conversation,
      role,
      setup: (server) => {
        if (sessions) withSessions(server, sessions)
      },
    })
    expect(linesOf(text()).after).toEqual(after)
  })
})
