import { expect, it } from 'vitest'
import { textBlocks, type TextBlock } from './agent-text'

/** A paragraph block of an answer. */
function p(paragraph: string): TextBlock {
  return { kind: 'p', text: paragraph }
}

it('reads lists by the list rules of the file preview, so an item holds the paragraphs, code, tables, and lists indented under it', () => {
  const text = [
    '1. Install the packages',
    'from the lockfile.',
    '',
    '   Run this in the root:',
    '',
    '   ```sh',
    '   npm ci',
    '   ```',
    '',
    '2. Check the sizes:',
    '   | Bundle | Size |',
    '   | --- | --- |',
    '   | checkout | 182 KB |',
    '  - Two spaces under a number stay out of the item.',
    '* A new marker character starts a new list.',
    '- A tab counts to the next stop of four columns,',
    '\t- so this item nests.',
  ].join('\n')
  expect(textBlocks(text)).toEqual([
    {
      kind: 'ol',
      start: 1,
      items: [
        [
          p('Install the packages from the lockfile.'),
          p('Run this in the root:'),
          { kind: 'code', text: 'npm ci' },
        ],
        [
          p('Check the sizes:'),
          {
            kind: 'table',
            head: ['Bundle', 'Size'],
            rows: [['checkout', '182 KB']],
            align: [null, null],
          },
        ],
      ],
    },
    {
      kind: 'ul',
      items: [[p('Two spaces under a number stay out of the item.')]],
    },
    { kind: 'ul', items: [[p('A new marker character starts a new list.')]] },
    {
      kind: 'ul',
      items: [
        [
          p('A tab counts to the next stop of four columns,'),
          { kind: 'ul', items: [[p('so this item nests.')]] },
        ],
      ],
    },
  ])
})

it('keeps the tabs of a code block outside a list', () => {
  const text = ['```make', 'build:', '\tgo build ./...', '```'].join('\n')
  expect(textBlocks(text)).toEqual([
    { kind: 'code', text: 'build:\n\tgo build ./...' },
  ])
})

it('nests lists at most 16 levels deep, as the file preview does, and shows deeper content as text', () => {
  const text = Array.from(
    { length: 18 },
    (_, level) => `${'  '.repeat(level)}- level ${level + 1}`,
  ).join('\n')
  const listIn = (blocks: readonly TextBlock[]) =>
    blocks.find((block) => block.kind === 'ul')
  let item: readonly TextBlock[] = textBlocks(text)
  let list = listIn(item)
  let depth = 0
  while (list?.kind === 'ul') {
    depth += 1
    item = list.items[0] ?? []
    list = listIn(item)
  }
  expect({ depth, deepest: item }).toEqual({
    depth: 16,
    deepest: [p('level 16 - level 17 - level 18')],
  })
})

it('ends a list item at an unindented line after a code block or a table, as CommonMark does', () => {
  const text = [
    '1. Run this:',
    '',
    '   ```sh',
    '   npm ci',
    '   ```',
    'Done.',
    '- Sizes:',
    '  | Bundle | Size |',
    '  | --- | --- |',
    '  | checkout | 182 KB |',
    'That is all.',
  ].join('\n')
  expect(textBlocks(text)).toEqual([
    {
      kind: 'ol',
      start: 1,
      items: [[p('Run this:'), { kind: 'code', text: 'npm ci' }]],
    },
    p('Done.'),
    {
      kind: 'ul',
      items: [
        [
          p('Sizes:'),
          {
            kind: 'table',
            head: ['Bundle', 'Size'],
            rows: [['checkout', '182 KB']],
            align: [null, null],
          },
        ],
      ],
    },
    p('That is all.'),
  ])
})

it('starts a list after a line of text only where CommonMark lets it, and before a table', () => {
  const blocksOf = (...lines: string[]) => textBlocks(lines.join('\n'))
  expect({
    numberInItem: blocksOf(
      '1. The supported runtime is',
      '   24. Use the lockfile.',
    ),
    numberAfterText: blocksOf('**Findings**', '3. Push the branch.'),
    numberAfterHeading: blocksOf('### Frontend', '3. Add the screen.'),
    emptyAfterText: blocksOf('The list:', '-'),
    tableInItem: blocksOf('- a | b', '  --- | ---', '  c | d'),
    headingEndsItem: blocksOf('1. Build the page.', ' ## Next'),
  }).toEqual({
    numberInItem: [
      {
        kind: 'ol',
        start: 1,
        items: [[p('The supported runtime is 24. Use the lockfile.')]],
      },
    ],
    numberAfterText: [p('**Findings** 3. Push the branch.')],
    numberAfterHeading: [
      p('Frontend'),
      { kind: 'ol', start: 3, items: [[p('Add the screen.')]] },
    ],
    emptyAfterText: [p('The list: -')],
    tableInItem: [
      {
        kind: 'ul',
        items: [
          [
            {
              kind: 'table',
              head: ['a', 'b'],
              rows: [['c', 'd']],
              align: [null, null],
            },
          ],
        ],
      },
    ],
    headingEndsItem: [
      { kind: 'ol', start: 1, items: [[p('Build the page.')]] },
      p('Next'),
    ],
  })
})
