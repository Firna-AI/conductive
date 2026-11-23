import { expect, test } from 'vitest'
import { parseMarkdownTokens } from './parser'

test('keeps ten thousand paired marks as text past twelve inline levels', () => {
  const source = '**'.repeat(10_000) + 'leaf' + '**'.repeat(10_000)
  const tokens = parseMarkdownTokens(source).tokens[1].children ?? []
  expect(tokens.filter((token) => token.type === 'strong_open')).toHaveLength(
    12,
  )
  expect(tokens.map((token) => token.content).join('')).toBe(
    '**'.repeat(9_988) + 'leaf' + '**'.repeat(9_988),
  )
})

test('counts images and links in the inline limit, including marks in image alt text', () => {
  const source =
    '**'.repeat(11) + '![**leaf**](https://e.com "Image")' + '**'.repeat(11)
  const tokens = parseMarkdownTokens(source).tokens[1].children ?? []
  const image = tokens.find((token) => token.type === 'image')
  expect(image?.children?.map(({ type, content }) => [type, content])).toEqual([
    ['text', '**leaf**'],
  ])
  const deeper =
    parseMarkdownTokens(
      '**'.repeat(12) + '![leaf](https://e.com "Image")' + '**'.repeat(12),
    ).tokens[1].children ?? []
  expect(deeper.filter((token) => token.type === 'image')).toHaveLength(0)
  expect(deeper.map((token) => token.content).join('')).toBe(
    '![leaf](https://e.com "Image")',
  )
})
