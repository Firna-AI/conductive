import { expect, it } from 'vitest'
import type { Session } from '../generated/Session'
import type { ToolCall } from '../generated/ToolCall'
import type { ChatEvent } from '../chat-events'

import { SessionMarkdown } from './session-markdown'
import { markdownFixture } from './session-markdown.test-support'

const { document } = markdownFixture()
const { choice } = document.session
const sessionId = document.session.id
const first = { sessionId, turnId: 'first' }
const next = { sessionId, turnId: 'next' }
const tests: ToolCall = {
  id: 'tests',
  kind: 'run',
  target: 'npm test',
  detail: null,
  omittedDetailBytes: 0,
  state: 'running',
}

/** A message of Cal, and its turn up to the tests that a provider stop cut off. */
const stoppedTurn: ChatEvent[] = [
  {
    type: 'message.accepted',
    message: {
      id: 'ask',
      sessionId,
      sender: {
        id: 'cal',
        displayName: 'Cal',
        githubLogin: 'cal',
        avatarUrl: null,
      },
      text: 'Run the tests.',
      choice,
      attachments: [],
      createdAt: 0,
      state: 'sent',
    },
  },
  {
    ...first,
    type: 'turn.started',
    senderId: 'cal',
    choice,
    startedAt: 0,
    messageIds: ['ask'],
  },
  { ...first, type: 'tool.updated', tool: tests },
  {
    ...first,
    type: 'turn.completed',
    state: 'stopped',
    endReason: 'cloud_computer_stopped',
    durationMs: 0,
    files: [],
    omittedFileCount: 0,
    userMessageIds: ['ask'],
  },
]

/** The concise copy of the events, in a session with the given login. */
function copied(
  events: readonly ChatEvent[],
  login?: Session['login'],
): string {
  const builder = new SessionMarkdown({
    ...document,
    session: {
      ...document.session,
      activeTurnId: null,
      activeTurnStartedAt: null,
      ...(login === undefined ? {} : { login }),
    },
    commands: [],
  })
  builder.merge(
    events.map((event, index) => ({
      eventNumber: index + 1,
      occurredAt: (index + 1) * 1_000,
      event,
    })),
  )
  return builder.render('concise')
}

it('copies the stopped line of a provider stop, then the line after it, and the continuation turn under its own heading', () => {
  const markdown = copied([
    ...stoppedTurn,
    {
      type: 'turn.continued',
      sessionId,
      previousTurnId: 'first',
      next: 'turn',
      turnId: 'next',
    },
    {
      ...next,
      type: 'turn.started',
      senderId: 'cal',
      choice,
      startedAt: 0,
      messageIds: ['continuation:first'],
    },
    {
      ...next,
      type: 'tool.updated',
      tool: { ...tests, id: 'again', detail: '14 passed', state: 'done' },
    },
    {
      ...next,
      type: 'assistant.completed',
      messageId: 'done',
      text: 'The tests pass.',
      userMessageIds: [],
    },
    {
      ...next,
      type: 'turn.completed',
      state: 'finished',
      durationMs: 158_000,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [],
    },
  ])
  expect(markdown).toBe(
    [
      '# Untitled',
      '',
      'W-395 · Untitled · https://app.example/orgs/org/workspaces/workspace',
      'Copied 9 November 2026, 18:40 UTC',
      '',
      '## Cal',
      '',
      'Run the tests.',
      '',
      '## Agent · GPT-6.1 Sol Extra high',
      '',
      '- Ran `npm test` · Stopped',
      '',
      '_The cloud computer stopped_',
      '',
      '_The agent continues when the cloud computer starts again_',
      '',
      '## Agent · GPT-6.1 Sol Extra high',
      '',
      '_1 tool call_',
      '',
      'The tests pass.',
      '',
      '_Finished in 2m 38s_',
      '',
    ].join('\n'),
  )
})

it.each<{
  name: string
  next: 'reconnect' | 'message'
  login?: Session['login']
  line: string
}>([
  {
    name: 'names the starter whose personal login is gone',
    next: 'reconnect',
    login: { type: 'personal', userId: 'cal' },
    line: '_The agent can continue after Cal connects Codex again_',
  },
  {
    name: 'names an admin of the org for the org login',
    next: 'reconnect',
    login: { type: 'org', orgId: 'org' },
    line: "_The agent can continue after an admin connects Acme's Codex login again_",
  },
  {
    name: 'asks for a message when no turn follows for another reason',
    next: 'message',
    line: '_Send a message to continue_',
  },
])(
  'copies the line after a provider stop that $name',
  ({ next, login, line }) => {
    const markdown = copied(
      [
        ...stoppedTurn,
        {
          type: 'turn.continued',
          sessionId,
          previousTurnId: 'first',
          next,
          turnId: null,
        },
      ],
      login,
    )
    expect(markdown.trimEnd().split('\n\n').slice(-2)).toEqual([
      '_The cloud computer stopped_',
      line,
    ])
  },
)
