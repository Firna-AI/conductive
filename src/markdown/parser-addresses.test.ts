import { expect, test } from 'vitest'
import { parseMarkdownTokens } from './parser'

test.each(['https', 'HTTPS', 'hTtPs', 'HTTP', 'hTtP'])(
  'protects %s bare address marks only in chat parses without leaking the switch',
  (scheme) => {
    const source = `${scheme}://github.com/acme/app/tree/main/__tests__/a.test.ts`
    const inline = (chat: boolean) =>
      parseMarkdownTokens(source, { chat }).tokens[1].children?.map(
        ({ type, content }) => [type, content],
      )
    expect(inline(true)).toEqual([['text', source]])
    expect(inline(false)).toEqual([
      ['text', `${scheme}://github.com/acme/app/tree/main/`],
      ['strong_open', ''],
      ['text', 'tests'],
      ['strong_close', ''],
      ['text', '/a.test.ts'],
    ])
    expect(inline(true)).toEqual([['text', source]])
  },
)
