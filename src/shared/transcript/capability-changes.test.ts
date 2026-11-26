import { expect, it } from 'vitest'

import type { CapabilityChangeNote } from '../capability-change'
import { groupEntries } from './transcript-entries'
import { SessionMarkdown } from './session-markdown'
import { markdownFixture } from './session-markdown.test-support'
import { emptyTranscript, foldEvent } from './transcript'

const member = {
  id: 'priya',
  githubLogin: 'priya',
  displayName: 'Priya Raman',
  avatarUrl: null,
}
const note: CapabilityChangeNote = {
  type: 'capabilities.changed',
  sessionId: 'session',
  noteId: 'note',
  member,
  changes: [{ kind: 'pre-approved', names: ['DEPLOY_KEY'] }],
}

it('keeps a repeated change note once, at its place outside the work of a finished turn', () => {
  const context = { sessionId: 'session', turnId: 'turn' }
  let transcript = foldEvent(
    emptyTranscript,
    {
      type: 'tool.updated',
      ...context,
      tool: {
        id: 'before',
        kind: 'run',
        target: 'check',
        detail: null,
        state: 'done',
        omittedDetailBytes: 0,
      },
    },
    1,
  )
  transcript = foldEvent(transcript, note, 2)
  transcript = foldEvent(
    transcript,
    {
      type: 'tool.updated',
      ...context,
      tool: {
        id: 'after',
        kind: 'run',
        target: 'deploy',
        detail: null,
        state: 'done',
        omittedDetailBytes: 0,
      },
    },
    3,
  )
  transcript = foldEvent(transcript, note, 2)
  transcript = foldEvent(
    transcript,
    {
      type: 'assistant.completed',
      ...context,
      messageId: 'answer',
      text: 'Done.',
      userMessageIds: [],
    },
    4,
  )
  transcript = foldEvent(
    transcript,
    {
      type: 'turn.completed',
      ...context,
      state: 'finished',
      durationMs: 0,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [],
    },
    5,
  )
  expect(
    transcript.items.filter((item) => item.kind === 'capabilities-changed'),
  ).toHaveLength(1)
  const entries = groupEntries(transcript, [])
  expect(
    entries.map((entry) =>
      entry.kind === 'item' ? entry.item.kind : entry.kind,
    ),
  ).toEqual(['work', 'capabilities-changed', 'work', 'agent', 'turn-end'])
})

it('gives concise and full copies the same member note between messages, without an agent heading', () => {
  const { document } = markdownFixture()
  const builder = new SessionMarkdown({
    ...document,
    commands: [],
    session: {
      ...document.session,
      activeTurnId: null,
      activeTurnStartedAt: null,
    },
    eventNumber: 0,
  })
  const message = (id: string, text: string) => ({
    type: 'message.accepted' as const,
    message: {
      id,
      sessionId: document.session.id,
      sender: member,
      text,
      attachments: [],
      choice: document.session.choice,
      createdAt: 1,
      state: 'sent' as const,
    },
  })
  builder.merge([
    { eventNumber: 1, occurredAt: 1, event: message('first', 'Before.') },
    {
      eventNumber: 2,
      occurredAt: 2,
      event: { ...note, sessionId: document.session.id },
    },
    { eventNumber: 3, occurredAt: 3, event: message('second', 'After.') },
  ])
  for (const detail of ['concise', 'full'] as const) {
    const copy = builder.render(detail)
    expect(copy).toContain(
      'Before.\n\n_Priya Raman pre-approved `DEPLOY_KEY`._\n\n## Priya Raman\n\nAfter.',
    )
    expect(copy).not.toContain('You ')
    expect(copy).not.toContain('## Agent')
  }
})
