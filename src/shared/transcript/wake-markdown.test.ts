import { expect, it } from 'vitest'
import type { SessionWatchNotice } from '../generated/SessionWatchNotice'
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
