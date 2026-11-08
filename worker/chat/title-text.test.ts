import { expect, it } from 'vitest'

import { cleanTitle } from './title-text'

it('cleans title decoration and cuts a long first line at a word boundary', () => {
  expect(
    cleanTitle(
      '\n  \n## **Title: `"Build reliable workspace titles from the first message with extra details."`**\nIgnore this line.',
    ),
  ).toBe('Build reliable workspace titles from the first message with')
  expect(cleanTitle(' _Title: “Fix the login route.”_ ')).toBe(
    'Fix the login route',
  )
  expect(cleanTitle('Title:   Fix\t the  login route.')).toBe(
    'Fix the login route',
  )
  expect(cleanTitle('Title: ""')).toBe('')
  expect(cleanTitle('Title: **"Fix login routes"**.')).toBe('Fix login routes')
  expect(cleanTitle('Fix login routes...')).toBe('Fix login routes...')
})
