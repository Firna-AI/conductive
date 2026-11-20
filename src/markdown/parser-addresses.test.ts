import { expect, test } from 'vitest'
import { parseMarkdownTokens } from './parser'

test('protects bare address marks only in chat parses without leaking the switch', () => {
  const source = 'https://github.com/acme/app/tree/main/__tests__/a.test.ts'
  const inline = (chat: boolean) =>
    parseMarkdownTokens(source, { chat }).tokens[1].children?.map(
      ({ type, content }) => [type, content],
    )
  expect(inline(true)).toEqual([['text', source]])
  expect(inline(false)).toEqual([
    ['text', 'https://github.com/acme/app/tree/main/'],
    ['strong_open', ''],
    ['text', 'tests'],
    ['strong_close', ''],
    ['text', '/a.test.ts'],
  ])
  expect(inline(true)).toEqual([['text', source]])
})
