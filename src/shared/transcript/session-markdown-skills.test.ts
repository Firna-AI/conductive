import { expect, it } from 'vitest'
import type { ToolCall } from '../chat-events'
import { SessionMarkdown } from './session-markdown'
import { markdownFixture } from './session-markdown.test-support'

it('copies skill names in concise folds and full tool lines', () => {
  const { document } = markdownFixture()
  const builder = new SessionMarkdown({
    ...document,
    session: {
      ...document.session,
      activeTurnId: null,
      activeTurnStartedAt: null,
    },
    commands: [],
  })
  const context = { sessionId: document.session.id, turnId: 'skills' }
  const call: ToolCall = {
    id: 'first-skill',
    kind: 'other',
    target: 'brainstorming',
    skills: ['brainstorming'],
    detail: 'high',
    omittedDetailBytes: 0,
    state: 'done',
  }
  const calls: readonly ToolCall[] = [
    call,
    {
      ...call,
      id: 'more-skills',
      kind: 'run',
      skills: ['plans', 'brainstorming'],
      target: 'plans, brainstorming',
      detail: 'cat SKILL.md',
      omittedDetailBytes: 1024,
    },
  ]
  builder.merge([
    {
      eventNumber: 1,
      occurredAt: 1,
      event: {
        ...context,
        type: 'turn.started',
        senderId: 'cal',
        choice: document.session.choice,
        startedAt: 0,
        messageIds: [],
      },
    },
    ...calls.map((tool, index) => ({
      eventNumber: index + 2,
      occurredAt: index + 2,
      event: { ...context, type: 'tool.updated' as const, tool },
    })),
    {
      eventNumber: 4,
      occurredAt: 4,
      event: {
        ...context,
        type: 'assistant.completed',
        messageId: 'answer',
        text: 'Ready.',
        userMessageIds: [],
      },
    },
    {
      eventNumber: 5,
      occurredAt: 5,
      event: {
        ...context,
        type: 'turn.completed',
        state: 'finished',
        durationMs: 1000,
        files: [],
        omittedFileCount: 0,
        userMessageIds: [],
      },
    },
  ])
  const heading = [
    '# Untitled',
    '',
    'W-395 · Untitled · https://app.example/orgs/org/workspaces/workspace',
    'Copied 9 November 2026, 18:40 UTC',
    '',
    '## Agent · GPT-6.1 Sol Extra high',
    '',
  ]
  const answer = ['', 'Ready.', '', '_Finished in 1s_', '']
  expect([builder.render('concise'), builder.render('full')]).toEqual([
    [
      ...heading,
      '_2 tool calls · Skills: brainstorming, plans · 1 KB of output left out_',
      ...answer,
    ].join('\n'),
    [
      ...heading,
      '- Used skill `brainstorming` · high',
      '',
      '- Used skills `plans, brainstorming` · cat SKILL.md · 1 KB left out',
      ...answer,
    ].join('\n'),
  ])
})
