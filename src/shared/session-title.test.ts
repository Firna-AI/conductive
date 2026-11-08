import { expect, it } from 'vitest'

import { sessionTitleFrom } from './session-title'

it.each([
  {
    name: 'skips leading blank lines and keeps Markdown marks and quotes',
    text: ' \n\t\n  **Keep** "these words"\nIgnore this next line',
    title: '**Keep** "these words"',
  },
  {
    name: 'makes each run of spaces one space',
    text: '  Keep   these\t words  ',
    title: 'Keep these words',
  },
  {
    name: 'removes one final full stop',
    text: 'Fix the title.',
    title: 'Fix the title',
  },
  {
    name: 'returns null for a single full stop',
    text: '.',
    title: null,
  },
  {
    name: 'trims the space before a removed final full stop',
    text: 'Fix the title .',
    title: 'Fix the title',
  },
  {
    name: 'keeps a final ellipsis',
    text: 'Still working...',
    title: 'Still working...',
  },
  {
    name: 'cuts a long line at the last space within 60 code points',
    text: '\n \nValidate  UK postcodes before the lookup, and show an error under the postcode field.\nIgnore the next line.',
    title: 'Validate UK postcodes before the lookup, and show an error',
  },
  {
    name: 'cuts a long word at 60 code points and keeps the complete emoji',
    text: '12345678901234567890123456789012345678901234567890123456789😀suffix',
    title: '12345678901234567890123456789012345678901234567890123456789😀',
  },
  {
    name: 'keeps a line of exactly 60 code points',
    text: '12345678901234567890123456789012345678901234567890123456789😀',
    title: '12345678901234567890123456789012345678901234567890123456789😀',
  },
  { name: 'returns null for no text', text: '', title: null },
  { name: 'returns null for blank text', text: ' \n\t\n ', title: null },
])('$name', ({ text, title }) => {
  expect(sessionTitleFrom(text)).toBe(title)
})
