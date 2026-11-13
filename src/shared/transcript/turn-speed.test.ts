import { expect, it } from 'vitest'

import { SessionMarkdown } from './session-markdown'
import { markdownFixture } from './session-markdown.test-support'

it('copies standard speed and its known cause after the duration and in a stop line, and nothing for a fast turn', () => {
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
        speed: { state: 'standard', cause: 'fast_limit' },
      },
    },
    {
      eventNumber: 2,
      occurredAt: 2,
      event: { ...completed, turnId: 'fast', speed: { state: 'fast' } },
    },
    {
      eventNumber: 3,
      occurredAt: 3,
      event: {
        ...completed,
        turnId: 'stopped',
        state: 'stopped',
        files: [],
        speed: { state: 'standard', cause: 'older_runner' },
      },
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
    '_Finished in 2m 5s · Standard speed · Fast limit reached. Changed files: `src/checks.ts`_',
    '',
    '## Agent · GPT-6.1 Sol Extra high',
    '',
    '_Finished in 2m 5s. Changed files: `src/checks.ts`_',
    '',
    '## Agent · GPT-6.1 Sol Extra high',
    '',
    '_The agent stopped · Standard speed · Older cloud computer software_',
    '',
  ].join('\n')
  expect(builder.render('concise')).toBe(expected)
  expect(builder.render('full')).toBe(expected)
})
