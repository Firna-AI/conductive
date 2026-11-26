import { expect, it } from 'vitest'

import { explanationPrompt } from './explain-prompt'

it('keeps only the first quote line in the heading and quotes each context line', () => {
  expect(
    explanationPrompt(
      {
        messageId: 'answer-1',
        before: 'Before one\r\nBefore two',
        quote: 'Selected text\nSecond line',
        after: 'After',
      },
      'https://conductive.build/orgs/org-1/workspaces/workspace-1/sessions/parent-1',
    ),
  ).toBe(
    'Explain "Selected text"\n\n' +
      'Session: https://conductive.build/orgs/org-1/workspaces/workspace-1/sessions/parent-1\n' +
      'Message: answer-1\n' +
      'The text with the lines around it:\n' +
      '> Before one\n> Before two\n> Selected text\n> Second line\n> After\n\n' +
      'Read that session with `read_session` if you need more context. Change no files. Keep the answer short, because it shows in a small popover.',
  )
})
