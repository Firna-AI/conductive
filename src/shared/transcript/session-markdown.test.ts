import { expect, it } from 'vitest'
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

it('keeps the newest run of a running turn open in a concise copy, and folds it when its turn ends', () => {
  const { builder, document } = markdownFixture()
  const context = { sessionId: document.session.id, turnId: 'live' }
  builder.merge([
    {
      eventNumber: 101,
      occurredAt: 101_000,
      event: {
        ...context,
        type: 'tool.updated',
        tool: {
          id: 'lint',
          kind: 'run',
          target: 'npm run lint',
          detail: null,
          omittedDetailBytes: 0,
          state: 'done',
        },
      },
    },
  ])
  expect(builder.render('concise')).toContain(
    'Partway.\n\n- Ran `npm run lint`\n\n_The agent is still working._\n',
  )

  builder.merge([
    {
      eventNumber: 102,
      occurredAt: 102_000,
      event: {
        ...context,
        type: 'turn.completed',
        state: 'finished',
        durationMs: 2_000,
        files: [],
        omittedFileCount: 0,
        userMessageIds: ['live'],
      },
    },
  ])
  expect(builder.render('concise')).toContain(
    'Partway.\n\n_1 tool call_\n\n_Finished in 2s_\n',
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

it('copies attached-file names in place and lists only files without a mention', () => {
  const { document } = markdownFixture()
  const builder = new SessionMarkdown({ ...document, commands: [] })
  const path = '.context/attachments/image/Login-screen.png'
  const file = {
    id: 'image',
    name: 'Login [screen].png',
    path,
    kind: 'image' as const,
    mediaType: 'image/png',
    sizeBytes: 25,
  }
  builder.merge([
    {
      eventNumber: 1,
      occurredAt: 1,
      event: {
        type: 'message.accepted',
        message: {
          id: 'files',
          sessionId: document.session.id,
          sender: {
            id: 'cal',
            githubLogin: 'cal',
            displayName: 'Cal',
            avatarUrl: null,
          },
          text: `Compare @${path} with @src/login.ts`,
          attachments: [
            file,
            {
              ...file,
              id: 'trace',
              path: null,
              name: 'trace.txt',
              kind: 'file',
            },
          ],
          choice: document.session.choice,
          createdAt: 0,
          state: 'queued',
        },
      },
    },
  ])
  const result = builder.render('full')
  expect(result).toContain(
    'Compare Login \\[screen\\].png with @src/login.ts\n\nAttachments: trace.txt',
  )
  expect(result).not.toContain(`@${path}`)
  expect(result).not.toContain('Attachments: Login')
})
