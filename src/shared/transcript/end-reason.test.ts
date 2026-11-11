import { expect, it } from 'vitest'

import { SessionMarkdown } from './session-markdown'
import { markdownFixture } from './session-markdown.test-support'

it('copies an end reason before the duration and files in concise and full transcripts', () => {
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
  const completed = {
    type: 'turn.completed',
    sessionId: document.session.id,
    state: 'finished',
    durationMs: 125_000,
    files: [
      { path: 'src/checks.ts', change: 'modified', added: 2, removed: 1 },
    ],
    omittedFileCount: 0,
    userMessageIds: [],
  } as const
  builder.merge([
    {
      eventNumber: 1,
      occurredAt: 1,
      event: {
        ...completed,
        turnId: 'limited',
        endReason: 'background_work_limit',
      },
    },
    {
      eventNumber: 2,
      occurredAt: 2,
      event: { ...completed, turnId: 'ordinary' },
    },
  ])
  const expected = [
    '# Untitled',
    '',
    'W-395 · Untitled · https://app.example/orgs/org/workspaces/workspace',
    'Copied 9 November 2026, 18:40 UTC',
    '',
    '## Agent · GPT-6.1 Sol Extra high',
    '',
    '_Background work stopped at the time limit_',
    '',
    '_Finished in 2m 5s. Changed files: `src/checks.ts`_',
    '',
    '## Agent · GPT-6.1 Sol Extra high',
    '',
    '_Finished in 2m 5s. Changed files: `src/checks.ts`_',
    '',
  ].join('\n')
  expect(builder.render('concise')).toBe(expected)
  expect(builder.render('full')).toBe(expected)
})
