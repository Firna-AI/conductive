import { expect, test } from 'vitest'
import { fenceLines, maxColouredLength } from './fence-lines'

test('colours a labelled block up to the size limit and leaves a longer block plain', () => {
  const line = 'let x = 1;\n'
  const atLimit = line.repeat(Math.floor(maxColouredLength / line.length))
  const overLimit = atLimit + 'x'.repeat(maxColouredLength)

  expect(fenceLines(atLimit, 'rust')?.[0]).toEqual([
    { kind: 'keyword', text: 'let' },
    { kind: 'plain', text: ' x = ' },
    { kind: 'number', text: '1' },
    { kind: 'plain', text: ';' },
  ])
  expect(fenceLines(overLimit, 'rust')).toBeNull()
})
