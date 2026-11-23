import { expect, test } from 'vitest'
import { markdownParser, parseMarkdownTokens } from './parser'

test('keeps an item after two or more blank lines in the list of an empty item, as CommonMark does', () => {
  const render = (source: string) => markdownParser.render(source)
  expect({
    bullet: render('-\n\n\n- b'),
    number: render('1.\n\n\n3. Third'),
    chain: render('-\n\n\n-\n\n\n- c'),
    quote: render('> -\n>\n>\n> - b'),
    nested: render('- a\n\n  -\n\n\n  - b'),
    otherMarker: render('-\n\n\n* b'),
    otherDelimiter: render('1.\n\n\n2) b'),
  }).toEqual({
    bullet: '<ul>\n<li></li>\n<li>\n<p>b</p>\n</li>\n</ul>\n',
    number: '<ol>\n<li></li>\n<li>\n<p>Third</p>\n</li>\n</ol>\n',
    chain: '<ul>\n<li></li>\n<li></li>\n<li>\n<p>c</p>\n</li>\n</ul>\n',
    quote:
      '<blockquote>\n<ul>\n<li></li>\n<li>\n<p>b</p>\n</li>\n</ul>\n</blockquote>\n',
    nested:
      '<ul>\n<li>\n<p>a</p>\n<ul>\n<li></li>\n<li>\n<p>b</p>\n</li>\n</ul>\n</li>\n</ul>\n',
    otherMarker: '<ul>\n<li></li>\n</ul>\n<ul>\n<li>b</li>\n</ul>\n',
    otherDelimiter:
      '<ol>\n<li></li>\n</ol>\n<ol start="2">\n<li>b</li>\n</ol>\n',
  })
})

test('gives the joined list the source lines of both parts, and leaves the blocks after it', () => {
  const { tokens } = parseMarkdownTokens('- a\n-\n\n\n- b\n\nafter')
  expect(
    tokens
      .filter((token) => token.block && token.nesting !== -1)
      .map((token) => [token.type, token.map]),
  ).toEqual([
    ['bullet_list_open', [0, 6]],
    ['list_item_open', [0, 1]],
    ['paragraph_open', [0, 1]],
    ['inline', [0, 1]],
    ['list_item_open', [1, 3]],
    ['list_item_open', [4, 6]],
    ['paragraph_open', [4, 5]],
    ['inline', [4, 5]],
    ['paragraph_open', [6, 7]],
    ['inline', [6, 7]],
  ])
})
