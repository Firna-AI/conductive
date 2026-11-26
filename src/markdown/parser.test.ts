import { describe, expect, test } from 'vitest'
import { parseMarkdownTokens } from './parser'
import { blockText, inlineValues } from './parser.test-support'

describe('shared Markdown parser', () => {
  test('reads CommonMark, tables, and strikethrough without automatic links or typography', () => {
    const { tokens } = parseMarkdownTokens(
      '*one* ~~two~~ &amp; <https://example.com>\n\n' +
        '| A | B |\n| --- | ---: |\n| x | y |\n\n' +
        'https://example.com -- "plain"...',
    )
    expect(
      tokens[1]?.children?.map(({ type, content }) => [type, content]),
    ).toEqual([
      ['em_open', ''],
      ['text', 'one'],
      ['em_close', ''],
      ['text', ' '],
      ['s_open', ''],
      ['text', 'two'],
      ['s_close', ''],
      ['text', ' & '],
      ['link_open', ''],
      ['text', 'https://example.com'],
      ['link_close', ''],
    ])
    expect(tokens.filter((token) => token.type === 'table_open')).toHaveLength(
      1,
    )
    expect(tokens.find((token) => token.type === 'th_open')?.attrs).toBeNull()
    expect(
      tokens.filter((token) => token.type === 'th_open')[1]?.attrs,
    ).toEqual([['style', 'text-align:right']])
    expect(
      tokens.at(-2)?.children?.map(({ type, content }) => [type, content]),
    ).toEqual([['text', 'https://example.com -- "plain"...']])
  })

  test('turns each break tag form into a hard break', () => {
    for (const tag of [
      '<br>',
      '<br/>',
      '<br />',
      '<BR>',
      '<Br/>',
      '<bR   >',
      '<br   /   >',
    ]) {
      expect(inlineValues(`a${tag}b`), tag).toEqual([
        ['text', 'a'],
        ['hardbreak', ''],
        ['text', 'b'],
      ])
    }
  })

  test('keeps other HTML, closing tags, attributes, entities, and escaped tags as text', () => {
    const source =
      '<b>bold</b> </br> <br class="x"> <br title="x" /> <brx> <br/ / >'
    expect(inlineValues(source)).toEqual([['text', source]])
    expect(inlineValues('\\<br> &lt;br&gt;')).toEqual([['text', '<br> <br>']])
  })

  test('keeps break tags literal in inline, fenced, and indented code', () => {
    const { tokens } = parseMarkdownTokens(
      '``a`<br />b``\n\n```html\n<br>\n```\n\n    <BR />',
    )
    expect(
      tokens[1]?.children?.map(({ type, content }) => [type, content]),
    ).toEqual([['code_inline', 'a`<br />b']])
    expect(
      tokens
        .filter((token) => ['fence', 'code_block'].includes(token.type))
        .map(({ type, content }) => [type, content]),
    ).toEqual([
      ['fence', '<br>\n'],
      ['code_block', '<BR />\n'],
    ])
  })

  test('reads break tags inside table cells and nested link labels', () => {
    const { tokens } = parseMarkdownTokens(
      '| A |\n| --- |\n| **a<br>b** [c<br>d](/doc) |',
    )
    const cell = tokens.find(
      (token) => token.content === '**a<br>b** [c<br>d](/doc)',
    )
    expect(cell?.children?.map((token) => token.type)).toEqual([
      'text',
      'strong_open',
      'text',
      'hardbreak',
      'text',
      'strong_close',
      'text',
      'link_open',
      'text',
      'hardbreak',
      'text',
      'link_close',
    ])
  })

  test('parses sixteen nested lists and quotes without dropping their text', () => {
    const items = Array.from({ length: 16 }, (_, index) => `item(${index})`)
    const list = items
      .map((item, index) => `${'  '.repeat(index)}- ${item}`)
      .join('\n')
    const parsedList = parseMarkdownTokens(list)
    expect(
      parsedList.tokens.filter((token) => token.type === 'bullet_list_open'),
    ).toHaveLength(16)
    expect(
      parsedList.tokens
        .filter((token) => token.type === 'inline')
        .map((token) => token.content),
    ).toEqual(items)
    const quote = parseMarkdownTokens(`${'> '.repeat(16)}leaf`)
    expect(
      quote.tokens.filter((token) => token.type === 'blockquote_open'),
    ).toHaveLength(16)
    expect(
      quote.tokens
        .filter((token) => token.type === 'inline')
        .map((token) => token.content),
    ).toEqual(['leaf'])
  })

  test('keeps every word of forty-level lists and quotes in order with bounded block parsing', () => {
    const items = Array.from({ length: 40 }, (_, index) => `item(${index})`)
    const list = items
      .map((item, index) => `${'  '.repeat(index)}- ${item}`)
      .join('\n')
    const parsedList = parseMarkdownTokens(`${list}\n\nafter`)
    expect(
      parsedList.tokens.filter((token) => token.type === 'bullet_list_open'),
    ).toHaveLength(17)
    expect(blockText(parsedList).match(/item\(\d+\)|after/g)).toEqual([
      ...items,
      'after',
    ])
    const quote = items
      .map((item, index) => `${'> '.repeat(index + 1)}${item}`)
      .join('\n')
    expect(
      blockText(parseMarkdownTokens(`${quote}\n\nafter`)).match(
        /item\(\d+\)|after/g,
      ),
    ).toEqual([...items, 'after'])
    const deepQuote = parseMarkdownTokens(`${'> '.repeat(80)}leaf\n\nafter`)
    expect(
      deepQuote.tokens.filter((token) => token.type === 'blockquote_open'),
    ).toHaveLength(17)
    expect(blockText(deepQuote).match(/leaf|after/g)).toEqual(['leaf', 'after'])
  })

  test('keeps line maps aligned across CRLF and CR without restoring references or leaking earlier containers', () => {
    parseMarkdownTokens(`${'> '.repeat(80)}deep`)
    const parsed = parseMarkdownTokens(
      '[ref]: /doc\r\n\r\n[label][ref]\r\r```\rliteral\r```\r',
    )
    expect(parsed.lines).toEqual([
      '[ref]: /doc',
      '',
      '[label][ref]',
      '',
      '```',
      'literal',
      '```',
      '',
    ])
    expect(
      parsed.tokens.filter((token) => token.type === 'blockquote_open'),
    ).toEqual([])
    expect(
      parsed.tokens
        .filter((token) => token.type === 'inline')
        .map((token) => token.map),
    ).toEqual([[2, 3]])
    expect(parsed.tokens[1]?.children?.[0].attrGet('href')).toBe('/doc')
  })

  test('finishes crafted reference, HTML, quote, and delimiter inputs and keeps the following paragraph', () => {
    const inputs = [
      ['reference definitions', '[a]: /url "' + 'x\n'.repeat(1024)],
      ['inline HTML', '<a ' + 'x="'.repeat(2048)],
      ['smart quotes', '"x" '.repeat(2048)],
      ['asterisks', 'a' + '*'.repeat(8192) + 'b'],
      ['brackets', '['.repeat(8192) + 'a' + ']'.repeat(4096)],
      ['backticks', 'a' + '`'.repeat(8192) + 'b'],
    ]
    for (const [shape, source] of inputs) {
      const parsed = parseMarkdownTokens(`${source}\n\nlast paragraph`)
      expect(parsed.tokens.at(-2)?.content, shape).toBe('last paragraph')
    }
  })
})
