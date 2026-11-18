import { expect, it } from 'vitest'
import { agentBlocks } from './agent-blocks'
import {
  blocksOf,
  h,
  p,
  shortBlocks,
  table,
  type ShortBlock,
} from './agent-text-test-kit'

it('reads lists by the list rules of CommonMark, so an item holds the paragraphs, code, tables, and lists indented under it', () => {
  expect(
    blocksOf(
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
    ),
  ).toEqual([
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
          table(['Bundle', 'Size'], [['checkout', '182 KB']]),
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
  expect(blocksOf('```make', 'build:', '\tgo build ./...', '```')).toEqual([
    { kind: 'code', text: 'build:\n\tgo build ./...' },
  ])
})

it('nests lists and quotes at most 16 levels deep, and shows deeper content and the lines that the parser drops as the text of a paragraph', () => {
  const list = Array.from(
    { length: 18 },
    (_, level) => `${'  '.repeat(level)}- level ${level + 1}`,
  ).join('\n')
  const inner = (blocks: readonly ShortBlock[]) =>
    blocks.find((block) => block.kind === 'ul' || block.kind === 'quote')
  let deepest: ShortBlock[] = shortBlocks(agentBlocks(list))
  let found = inner(deepest)
  let depth = 0
  while (found?.kind === 'ul') {
    depth += 1
    deepest = found.items[0] ?? []
    found = inner(deepest)
  }
  let quote = shortBlocks(agentBlocks(`${'> '.repeat(80)}leaf\n\nafter`))
  let quotes = 0
  while (quote[0]?.kind === 'quote') {
    quotes += 1
    quote = quote[0].blocks
  }
  expect({ depth, deepest, quotes, quote }).toEqual({
    depth: 16,
    deepest: [p('level 16'), p('- level 17 - level 18')],
    quotes: 16,
    quote: [p(`${'> '.repeat(64)}leaf`)],
  })
  expect(blocksOf(`${'> '.repeat(80)}leaf`, '', 'after').at(-1)).toEqual(
    p('after'),
  )
})

it('ends a list item at an unindented line after a code block or a table, as CommonMark does', () => {
  expect(
    blocksOf(
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
    ),
  ).toEqual([
    {
      kind: 'ol',
      start: 1,
      items: [[p('Run this:'), { kind: 'code', text: 'npm ci' }]],
    },
    p('Done.'),
    {
      kind: 'ul',
      items: [
        [p('Sizes:'), table(['Bundle', 'Size'], [['checkout', '182 KB']])],
      ],
    },
    p('That is all.'),
  ])
})

it('starts a list after a line of text only where CommonMark lets it, and keeps an indented table inside its item', () => {
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
    numberAfterText: [p('<b>Findings</b> 3. Push the branch.')],
    numberAfterHeading: [
      h(3, 'Frontend'),
      { kind: 'ol', start: 3, items: [[p('Add the screen.')]] },
    ],
    emptyAfterText: [p('The list: -')],
    tableInItem: [{ kind: 'ul', items: [[table(['a', 'b'], [['c', 'd']])]] }],
    headingEndsItem: [
      { kind: 'ol', start: 1, items: [[p('Build the page.')]] },
      h(2, 'Next'),
    ],
  })
})

it('reads one to six hashes and a space as a heading of that level, without its closing hashes, in a block of its own, and leaves out a heading with no text', () => {
  expect({
    levels: blocksOf(
      '# Review of #482',
      '## Needs your answer',
      '### 1. Lookups can pass the rate limit',
      '#### How I checked',
      '##### Unit tests',
      '###### Notes',
    ),
    closing: blocksOf('## Needs your answer ##'),
    seven: blocksOf('####### Seven marks'),
    tag: blocksOf('#482 is merged.'),
    between: blocksOf('The tests pass.', '## Next', 'Push the branch.'),
    inItem: blocksOf('- Plan:', '  ### Steps', '  Run the tests.', '- Push.'),
    empty: blocksOf('The tests pass.', '## '),
  }).toEqual({
    levels: [
      h(1, 'Review of #482'),
      h(2, 'Needs your answer'),
      h(3, '1. Lookups can pass the rate limit'),
      h(4, 'How I checked'),
      h(5, 'Unit tests'),
      h(6, 'Notes'),
    ],
    closing: [h(2, 'Needs your answer')],
    seven: [p('####### Seven marks')],
    tag: [p('#482 is merged.')],
    between: [p('The tests pass.'), h(2, 'Next'), p('Push the branch.')],
    inItem: [
      {
        kind: 'ul',
        items: [[p('Plan:'), h(3, 'Steps'), p('Run the tests.')], [p('Push.')]],
      },
    ],
    empty: [p('The tests pass.')],
  })
})

it('reads an underline under the text of a paragraph as a heading once a line break follows it, and never under a quote, indented code, or a lazy line', () => {
  expect({
    equals: blocksOf('Review of #482', '===', 'The tests pass.'),
    hyphens: blocksOf('Needs your', 'answer', '---', ''),
    inItem: blocksOf('- Plan', '  ---', '- Push.'),
    atEnd: blocksOf('The tests pass.', '---'),
    inQuoteAtEnd: blocksOf('> The tests pass.', '> ---'),
    quote: blocksOf('> Note', '---', ''),
    code: blocksOf('    npm ci', '===', ''),
    lazy: blocksOf('- Plan', '===', ''),
  }).toEqual({
    equals: [h(1, 'Review of #482'), p('The tests pass.')],
    hyphens: [h(2, 'Needs your answer')],
    inItem: [{ kind: 'ul', items: [[h(2, 'Plan')], [p('Push.')]] }],
    atEnd: [p('The tests pass. ---')],
    inQuoteAtEnd: [{ kind: 'quote', blocks: [p('The tests pass. ---')] }],
    quote: [{ kind: 'quote', blocks: [p('Note')] }, { kind: 'rule' }],
    code: [{ kind: 'code', text: 'npm ci' }, p('===')],
    lazy: [{ kind: 'ul', items: [[p('Plan ===')]] }],
  })
})

it('reads a quote with each block that it holds, each rule, and the own cells of each row of a table in a quote', () => {
  expect({
    quote: blocksOf(
      '> **Note:** the tests pass.',
      '>',
      '> - one',
      '> - two',
      '>',
      '> ```',
      '> npm ci',
      '> ```',
      '> > Each key press sends a lookup.',
      '>',
      '>',
    ),
    rules: blocksOf('Done.', '', '---', '***', '___'),
    table: blocksOf(
      '> | Bundle | Main | Change |',
      '> | --- | ---: | --- |',
      '> | checkout | 182 KB |',
      '| api |',
    ),
  }).toEqual({
    quote: [
      {
        kind: 'quote',
        blocks: [
          p('<b>Note:</b> the tests pass.'),
          { kind: 'ul', items: [[p('one')], [p('two')]] },
          { kind: 'code', text: 'npm ci' },
          { kind: 'quote', blocks: [p('Each key press sends a lookup.')] },
        ],
      },
    ],
    rules: [p('Done.'), { kind: 'rule' }, { kind: 'rule' }, { kind: 'rule' }],
    table: [
      {
        kind: 'quote',
        blocks: [
          {
            kind: 'table',
            head: ['Bundle', 'Main', 'Change'],
            rows: [['checkout', '182 KB']],
            align: [null, 'right', null],
          },
        ],
      },
      p('| api |'),
    ],
  })
})
