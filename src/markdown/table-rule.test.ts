import { expect, test } from 'vitest'
import { parseMarkdownTokens } from './parser'

test('allocates only source cells for short rows, including repeated sparse tables', () => {
  for (const [columns, rows, tables] of [
    [2, 1, 1],
    [200, 200, 40],
    [1024, 64, 48],
  ]) {
    const sparse =
      'a|'.repeat(columns) +
      '\n' +
      '-|'.repeat(columns) +
      '\n' +
      '|\n'.repeat(rows)
    const source = Array(tables).fill(sparse).join('\n')
    const { tokens } = parseMarkdownTokens(source)
    expect(tokens.filter((token) => token.type === 'td_open')).toHaveLength(0)
    expect(tokens.filter((token) => token.type === 'table_open')).toHaveLength(
      tables,
    )
    expect(tokens.length).toBeLessThan(source.length * 2)
  }
})

test('records the library missing-cell stop as a source line before references disappear', () => {
  const source =
    'a|'.repeat(1024) +
    '\n' +
    '-|'.repeat(1024) +
    '\n' +
    '|\n'.repeat(64) +
    '[ref]: <a|b>\n\n# After'
  const { tokens } = parseMarkdownTokens(source)
  expect(tokens[0].meta?.tableStopLine).toBe(66)
  expect(tokens.filter((token) => token.type === 'tr_open')).toHaveLength(65)
})
