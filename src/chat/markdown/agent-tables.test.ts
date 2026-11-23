import { expect, test } from 'vitest'
import { agentBlocks } from './agent-blocks'
import { blocksOf, h, p, table } from './agent-text-test-kit'

test('keeps a blank chat table row and the next short row as one cell each', () => {
  const tables = agentBlocks('a|b\n-|-\n|\n| kept |').filter(
    (block) => block.kind === 'table',
  )
  expect(tables).toHaveLength(1)
  expect(tables[0].rows.map((row) => row.length)).toEqual([1, 1])
})

test('keeps one cell per empty chat row, including repeated wide tables', () => {
  for (const [columns, rows, count] of [
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
    const tables = agentBlocks(Array(count).fill(sparse).join('\n')).filter(
      (block) => block.kind === 'table',
    )
    expect(tables).toHaveLength(count)
    expect(
      tables.reduce(
        (sum, table) =>
          sum + table.rows.reduce((cells, row) => cells + row.length, 0),
        0,
      ),
    ).toBe(rows * count)
  }
})

test('keeps every chat row when missing cells exceed 65,536', () => {
  const source =
    'a|'.repeat(1024) + '\n' + '-|'.repeat(1024) + '\n' + '|\n'.repeat(65)
  const blocks = agentBlocks(source)
  const tables = blocks.filter((block) => block.kind === 'table')
  expect(tables[0].rows).toHaveLength(65)
  expect(tables[0].rows.map((row) => row.length)).toEqual(Array(65).fill(1))
  expect(blocks.map((block) => block.kind)).toEqual(['table'])
})

test('keeps a line without a pipe as one more chat row of one cell', () => {
  expect(blocksOf('a | b', '--- | ---', 'c | d', 'no pipe')).toEqual([
    table(['a', 'b'], [['c', 'd'], ['no pipe']]),
  ])
})

test.each([
  ['- a | b', [{ kind: 'ul', items: [[p('a | b --- | ---')]] }]],
  ['1. a | b', [{ kind: 'ol', start: 1, items: [[p('a | b --- | ---')]] }]],
  ['> a | b', [{ kind: 'quote', blocks: [p('a | b --- | ---')] }]],
  ['# a | b', [h(1, 'a | b'), p('--- | ---')]],
])(
  'keeps the block mark of %s out of a chat table header',
  (header, blocks) => {
    expect(blocksOf(header, '--- | ---')).toEqual(blocks)
  },
)
