import { expect, test } from 'vitest'
import { agentBlocks } from './agent-blocks'

test('adds no cells to sparse chat rows, including repeated wide tables', () => {
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
    ).toBe(0)
  }
})
