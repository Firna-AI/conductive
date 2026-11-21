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

test.each([
  [
    'four-character prefix, http',
    'See ',
    'http://x.example',
    'https://y.example',
  ],
  [
    'four-character prefix, https',
    'See ',
    'https://x.example',
    'https://y.example',
  ],
  [
    'four-character prefix, HTTP',
    'See ',
    'HTTP://x.example',
    'https://y.example',
  ],
  [
    'four-character prefix, HTTPS',
    'See ',
    'HTTPS://x.example',
    'https://y.example',
  ],
  [
    'five-character prefix, http',
    'Seen ',
    'http://x.example',
    'https://y.example',
  ],
  [
    'five-character prefix, https',
    'Seen ',
    'https://x.example',
    'https://y.example',
  ],
  [
    'five-character prefix, HTTP',
    'Seen ',
    'HTTP://x.example',
    'https://y.example',
  ],
  [
    'five-character prefix, HTTPS',
    'Seen ',
    'HTTPS://x.example',
    'https://y.example',
  ],
  ['long prefix, http', 'Please read ', 'http://x.example', 'http://x.example'],
  [
    'long prefix, https',
    'Please read ',
    'https://x.example',
    'https://x.example',
  ],
  ['long prefix, HTTP', 'Please read ', 'HTTP://x.example', 'HTTP://x.example'],
  [
    'long prefix, HTTPS',
    'Please read ',
    'HTTPS://x.example',
    'HTTPS://x.example',
  ],
  ['mixed-case HTTP', 'See ', 'hTtP://x.example', 'https://y.example'],
  ['mixed-case HTTPS', 'Seen ', 'hTtPs://x.example', 'https://y.example'],
  ['pending HTTP scheme', 'http', 'http://x.example', 'http://x.example'],
  ['pending HTTPS scheme', 'https', 'https://x.example', 'https://x.example'],
])(
  'keeps a Markdown link with an address label for %s',
  (_name, prefix, label, href) => {
    const plain = `${prefix}${label} now`
    expect(
      parseMarkdownTokens(plain, { chat: true }).tokens[1].children?.map(
        ({ type, content }) => [type, content],
      ),
    ).toEqual([['text', plain]])
    const inline = parseMarkdownTokens(`${prefix}[${label}](${href}) now`, {
      chat: true,
    }).tokens[1].children
    expect(inline?.map(({ type, content }) => [type, content])).toEqual([
      ['text', prefix],
      ['link_open', ''],
      ['text', label],
      ['link_close', ''],
      ['text', ' now'],
    ])
    expect(
      inline?.find((token) => token.type === 'link_open')?.attrGet('href'),
    ).toBe(href)
  },
)

test('keeps address labels inside links and protects bare paths inside bold text', () => {
  const label = 'https://example.com/__tests__/a'
  const { tokens } = parseMarkdownTokens(
    `Seen [${label}](https://y.example) and **${label}** now`,
    { chat: true },
  )
  expect(
    tokens[1].children
      ?.filter(({ type, content }) => type !== 'text' || content !== '')
      .map(({ type, content }) => [type, content]),
  ).toEqual([
    ['text', 'Seen '],
    ['link_open', ''],
    ['text', 'https://example.com/'],
    ['strong_open', ''],
    ['text', 'tests'],
    ['strong_close', ''],
    ['text', '/a'],
    ['link_close', ''],
    ['text', ' and '],
    ['strong_open', ''],
    ['text', label],
    ['strong_close', ''],
    ['text', ' now'],
  ])
})
