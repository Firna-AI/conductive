import { expect, it } from 'vitest'

import { readChatEvent } from '../../chat/api/read-chat'
import type { ChatEvent } from '../chat-events'
import { sessionLink } from '../session-link'
import { SessionMarkdown } from './session-markdown'
import { markdownFixture } from './session-markdown.test-support'
import { emptyTranscript, foldEvent } from './transcript'

it('keeps the first tool stop through parsing and folding and copies a safe session link', () => {
  const { document } = markdownFixture()
  for (const workspaceId of ['workspace', 'source_workspace']) {
    const reference = { workspaceId, sessionId: 'source_session' }
    const stop = {
      type: 'turn.stop-requested',
      sessionId: 'session',
      turnId: 'turn',
      requestedBySession: reference,
    } as const
    const end: ChatEvent = {
      type: 'turn.completed',
      sessionId: 'session',
      turnId: 'turn',
      state: 'stopped',
      durationMs: 1,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [],
    }
    const transcript = foldEvent(foldEvent(emptyTranscript, stop, 1), end, 2)
    expect(transcript.items).toMatchObject([
      { kind: 'stopped', by: null, from: reference },
    ])
    expect(readChatEvent(stop)).toEqual(stop)
    const builder = new SessionMarkdown({ ...document, commands: [] })
    builder.merge([
      { eventNumber: 1, occurredAt: 1, event: readChatEvent(stop) },
      {
        eventNumber: 2,
        occurredAt: 2,
        event: {
          type: 'turn.stop-requested',
          sessionId: 'session',
          turnId: 'turn',
          requestedById: 'cal',
        },
      },
      { eventNumber: 3, occurredAt: 3, event: end },
    ])
    const line = `_Stopped from <${sessionLink('https://app.example', 'org', workspaceId, 'source_session')}>_`
    expect(builder.render('full')).toContain(line)
    expect(builder.render('concise')).toContain(line)
    expect(builder.render('full')).not.toContain('Cal stopped the agent')
  }
})
