import MarkdownIt from 'markdown-it'
import { expect, it } from 'vitest'
import type { SessionWatchNotice } from '../generated/SessionWatchNotice'
import { envelope } from './batch-fold.test-support'
import { markdownFixture } from './session-markdown.test-support'

it('copies a wake as one line of the app with the link that the agent got, and no heading of a sender', () => {
  const { builder, document } = markdownFixture()
  const { id: sessionId, choice } = document.session
  const link = 'https://app.example/orgs/org/workspaces/other/sessions/debounce'
  const notice: SessionWatchNotice = {
    type: 'session.watch-notice',
    watchId: 'watch-1',
    messageId: 'session-watch:watch-1',
    sessionId,
    turnId: 'woken',
    watchedWorkspaceId: 'other',
    watchedSession: { id: 'debounce', link },
    watchedTurnId: 'debounce-turn',
    state: 'finished',
    reason: 'background_work_limit',
  }
  const live = { sessionId, turnId: 'live' }
  const woken = { sessionId, turnId: 'woken' }
  builder.merge(
    [
      notice,
      {
        ...live,
        type: 'turn.completed',
        state: 'finished',
        durationMs: 2_000,
        files: [],
        omittedFileCount: 0,
        userMessageIds: ['live'],
      } as const,
      notice,
      {
        ...woken,
        type: 'turn.started',
        senderId: 'cal',
        choice,
        startedAt: 0,
        messageIds: [notice.messageId],
      } as const,
      {
        ...woken,
        type: 'assistant.completed',
        messageId: 'read',
        text: 'Debounce passed its tests.',
        userMessageIds: [notice.messageId],
      } as const,
    ].map((event, index) => ({
      event,
      eventNumber: 101 + index,
      occurredAt: (101 + index) * 1000,
    })),
  )
  expect(builder.render('concise')).toContain(
    [
      'Partway.',
      '',
      '_Finished in 2s_',
      '',
      '## Agent · GPT-6.1 Sol Extra high',
      '',
      `_A turn finished in <${link}> · Background work stopped at the time limit_`,
      '',
      'Debounce passed its tests.',
      '',
      '_The agent is still working._',
      '',
    ].join('\n'),
  )
})

const fencedWakeText = '```sh\nnpm test\n```'
const wakeMessageId = 'message-for-wake'
const watchedLink =
  'https://app.example/orgs/org/workspaces/other/sessions/debounce'

it('copies a fenced wake-up as a code block before the next turn heading', () => {
  const { builder, document } = markdownFixture()
  const { id: sessionId, choice } = document.session
  builder.merge([
    envelope(101, {
      type: 'turn.completed',
      sessionId,
      turnId: 'live',
      state: 'finished',
      durationMs: 2_000,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['live'],
    }),
    envelope(102, {
      type: 'session.wake-up-fired',
      sessionId,
      turnId: 'woken',
      messageId: wakeMessageId,
      wakeUpId: 'wake-up-1',
      text: fencedWakeText,
    }),
    envelope(103, {
      type: 'turn.started',
      sessionId,
      turnId: 'woken',
      senderId: 'cal',
      choice,
      startedAt: 0,
      messageIds: [wakeMessageId],
    }),
    envelope(104, {
      type: 'assistant.completed',
      sessionId,
      turnId: 'woken',
      messageId: 'wake-answer',
      text: 'The tests passed.',
      userMessageIds: [wakeMessageId],
    }),
  ])
  const tokens = new MarkdownIt('commonmark').parse(builder.render('full'), {})
  const fence = tokens.findIndex(
    (token) => token.type === 'fence' && token.content === 'npm test\n',
  )
  expect(tokens.slice(fence - 2, fence + 4)).toMatchObject([
    { type: 'inline', content: 'Wake-up:' },
    { type: 'paragraph_close' },
    { type: 'fence', info: 'sh', content: 'npm test\n' },
    { type: 'heading_open', tag: 'h2' },
    { type: 'inline', content: 'Agent · GPT-6.1 Sol Extra high' },
    { type: 'heading_close', tag: 'h2' },
  ])
})

it.each([
  {
    type: 'session.wake-up-fired',
    label: 'scheduled wake-up',
    markdown: `Wake-up:\n\n${fencedWakeText}`,
  },
  {
    type: 'session.watch-notice',
    label: 'watch wake',
    markdown: `_A turn finished in <${watchedLink}>_`,
  },
] as const)(
  'starts a fresh agent heading after a joined $label',
  ({ type, markdown }) => {
    const { builder, document } = markdownFixture()
    const { id: sessionId } = document.session
    const context = { sessionId, turnId: 'live', messageId: wakeMessageId }
    builder.merge([
      envelope(
        101,
        type === 'session.wake-up-fired'
          ? { ...context, type, wakeUpId: 'wake-up-1', text: fencedWakeText }
          : {
              ...context,
              type,
              watchId: 'watch-1',
              watchedWorkspaceId: 'other',
              watchedSession: { id: 'debounce', link: watchedLink },
              watchedTurnId: 'debounce-turn',
              state: 'finished',
              reason: null,
            },
      ),
      envelope(102, { ...context, type: 'message.sent' }),
      envelope(103, {
        ...context,
        type: 'assistant.completed',
        messageId: 'wake-answer',
        text: 'The tests passed.',
        userMessageIds: [wakeMessageId],
      }),
    ])
    expect(builder.render('full')).toContain(
      [
        'Partway.',
        markdown,
        '## Agent · GPT-6.1 Sol Extra high',
        'The tests passed.',
      ].join('\n\n'),
    )
  },
)
