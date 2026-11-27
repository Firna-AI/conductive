import { expect, it } from 'vitest'
import { agentBlocks } from './agent-blocks'
import {
  blocksOf,
  h,
  p,
  shortBlocks,
  type ShortBlock,
} from './agent-text-test-kit'

it('keeps the tabs of a code block outside a list', () => {
  expect(blocksOf('```make', 'build:', '\tgo build ./...', '```')).toEqual([
    { kind: 'code', text: 'build:\n\tgo build ./...', label: 'make' },
  ])
})

it('keeps fence labels and uses null for unlabelled and indented chat code', () => {
  expect(
    blocksOf(
      '```RuST,ignore',
      'fn main() {}',
      '```',
      '',
      '```',
      'command output',
      '```',
      '',
      '    indented',
      '',
      '~~~TS title="example"',
      'let count = 1',
      '~~~',
    ),
  ).toEqual([
    { kind: 'code', text: 'fn main() {}', label: 'rust' },
    { kind: 'code', text: 'command output', label: null },
    { kind: 'code', text: 'indented', label: null },
    { kind: 'code', text: 'let count = 1', label: 'ts' },
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
    const [item] = found.items
    deepest = Array.isArray(item) ? item : (item?.blocks ?? [])
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

it('reads one to six hashes and a space as a heading of that level, without its closing hashes, in a block of its own, leaves out a heading that shows no words, and shows a mark without its pair as typed', () => {
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
    codeSpace: blocksOf('The tests pass.', '## ` `', 'Push the branch.'),
    boldOnly: blocksOf('The tests pass.', '## **', 'Push the branch.'),
    codeOnly: blocksOf('### `'),
    spaceOnly: blocksOf('## ** **'),
    formatted: blocksOf('## **Plan**', '### `npm ci`', '#### **Pla'),
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
    codeSpace: [p('The tests pass.'), p('Push the branch.')],
    boldOnly: [p('The tests pass.'), h(2, '**'), p('Push the branch.')],
    codeOnly: [h(3, '`')],
    spaceOnly: [h(2, '** **')],
    formatted: [h(2, '<b>Plan</b>'), h(3, '`npm ci`'), h(4, '**Pla')],
  })
})

it('reads an underline under the text of a paragraph as a heading once a line break follows it, and never under a quote, indented code, or a lazy line, with a mark without its pair as typed', () => {
  expect({
    equals: blocksOf('Review of #482', '===', 'The tests pass.'),
    hyphens: blocksOf('Needs your', 'answer', '---', ''),
    inItem: blocksOf('- Plan', '  ---', '- Push.'),
    atEnd: blocksOf('The tests pass.', '---'),
    inQuoteAtEnd: blocksOf('> The tests pass.', '> ---'),
    quote: blocksOf('> Note', '---', ''),
    code: blocksOf('    npm ci', '===', ''),
    lazy: blocksOf('- Plan', '===', ''),
    mixedEndings: shortBlocks(
      agentBlocks('Before.\r\n## Next\r\nBody.\r\rUnderline\n===\rAfter.'),
    ),
    boldOnly: blocksOf('**', '---', 'Push the branch.'),
    formatted: blocksOf('**Plan**', '===', ''),
  }).toEqual({
    equals: [h(1, 'Review of #482'), p('The tests pass.')],
    hyphens: [h(2, 'Needs your answer')],
    inItem: [{ kind: 'ul', items: [[h(2, 'Plan')], [p('Push.')]] }],
    atEnd: [p('The tests pass. ---')],
    inQuoteAtEnd: [{ kind: 'quote', blocks: [p('The tests pass. ---')] }],
    quote: [{ kind: 'quote', blocks: [p('Note')] }, { kind: 'rule' }],
    code: [{ kind: 'code', text: 'npm ci', label: null }, p('===')],
    lazy: [{ kind: 'ul', items: [[p('Plan ===')]] }],
    mixedEndings: [
      p('Before.'),
      h(2, 'Next'),
      p('Body.'),
      h(1, 'Underline'),
      p('After.'),
    ],
    boldOnly: [h(2, '**'), p('Push the branch.')],
    formatted: [h(1, '<b>Plan</b>')],
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
          { kind: 'code', text: 'npm ci', label: null },
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
