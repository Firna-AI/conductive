import { expect, it } from 'vitest'
import type { ToolCall } from '../chat-events'
import { SessionMarkdown } from './session-markdown'
import { markdownFixture } from './session-markdown.test-support'

const prefix = [
  '# Untitled',
  '',
  'W-395 · Untitled · https://app.example/orgs/org/workspaces/workspace',
  'Copied 9 November 2026, 18:40 UTC',
  '',
  '## Cal',
  '',
  'Please check.',
  '',
  'Attachments: trace.txt',
  '',
  '## Agent · Opus 5.5 Max',
  '',
]
const finished = [
  'Fixed.',
  '',
  '_Finished in 1m 1s. Changed files: `old/[redacted].ts` → `new/[redacted].ts` · 3 more files_',
  '',
  '## Agent · GPT-6.1 Sol Extra high',
  '',
]
const ending = [
  '## priya',
  '',
  'Stop now.',
  '',
  '## Agent · GPT-6.1 Sol Extra high',
  '',
  '- Ran `npm test` · Stopped',
  '',
  '_Cal stopped the agent · 2 changed files not listed_',
  '',
  '## Cal',
  '',
  'Try again.',
  '',
  '## Agent · GPT-6.1 Sol Extra high',
  '',
  '_This turn stopped: The agent is busy._',
  '',
  '## Cal',
  '',
  'Keep working.',
  '',
  '## Agent · GPT-6.1 Sol Extra high',
  '',
  'Partway.',
  '',
  '_The agent is still working._',
  '',
]

it('copies the concise chat with default folds and the historical model choices', () => {
  const { builder } = markdownFixture()
  expect(builder.render('concise')).toBe(
    [
      ...prefix,
      '_1 tool call, 1 message · 1 KB of output left out_',
      '',
      ...finished,
      '_1 tool call_',
      '',
      ...ending,
    ].join('\n'),
  )
})

it('copies full work with command output, safe fences, loss, and masked file labels', () => {
  const { builder } = markdownFixture()
  expect(builder.render('full')).toBe(
    [
      ...prefix,
      'I will check.',
      '',
      '- Read `` `src/[redacted].ts` `` · Read the file. · 1 KB left out',
      '',
      '_A tool update was lost because it was too large_',
      '',
      "Mac command · Cal's Mac · Done in 4s",
      '',
      '````sh',
      "printf '`ready`'",
      '```',
      '````',
      '',
      'in `/checkout` · up to 60 seconds',
      '',
      '````',
      'ok',
      '```',
      '````',
      '',
      'The output stops at its size limit. The agent got the same part.',
      '',
      ...finished,
      '- Searched `docs`',
      '',
      ...ending,
    ].join('\n'),
  )
})

it('keeps tool details on one plain list line and escapes title and stop-member metadata', () => {
  const { document } = markdownFixture()
  const builder = new SessionMarkdown({
    ...document,
    session: {
      ...document.session,
      title: 'Safe [title]',
      activeTurnId: null,
      activeTurnStartedAt: null,
    },
    commands: [],
    members: [{ id: 'cal', displayName: 'Cal *Ops*', githubLogin: 'cal' }],
  })
  const context = { sessionId: document.session.id, turnId: 'turn' }
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
    {
      eventNumber: 2,
      occurredAt: 2,
      event: {
        ...context,
        type: 'tool.updated',
        tool: {
          id: 'run',
          kind: 'run',
          target: '`backtick`\nnext',
          detail: 'First\n*next*.',
          omittedDetailBytes: 0,
          state: 'running',
        },
      },
    },
    {
      eventNumber: 3,
      occurredAt: 3,
      event: { ...context, type: 'turn.stop-requested', requestedById: 'cal' },
    },
    {
      eventNumber: 4,
      occurredAt: 4,
      event: {
        ...context,
        type: 'turn.completed',
        state: 'stopped',
        durationMs: 4,
        files: [],
        omittedFileCount: 0,
        userMessageIds: [],
      },
    },
  ])
  expect(builder.render('full')).toBe(
    [
      '# Safe \\[title\\]',
      '',
      'W-395 · Untitled · https://app.example/orgs/org/workspaces/workspace',
      'Copied 9 November 2026, 18:40 UTC',
      '',
      '## Agent · GPT-6.1 Sol Extra high',
      '',
      '- Ran `` `backtick` next `` · First \\*next\\*. · Stopped',
      '',
      '_Cal \\*Ops\\* stopped the agent_',
      '',
    ].join('\n'),
  )
})

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
