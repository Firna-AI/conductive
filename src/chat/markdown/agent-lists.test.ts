import { expect, it } from 'vitest'
import { blocksOf, h, p, table } from './agent-text-test-kit'

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

it('ends a list item at an unindented line after a code block or a table, or an empty item at the blank line after its marker, as CommonMark does', () => {
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
  expect({
    paragraph: blocksOf('-', '', '  Outside'),
    list: blocksOf('-', '', '  - inner'),
    bulletSibling: blocksOf('-', '', '', '- b'),
    numberSibling: blocksOf('1.', '', '2. Second'),
    noBlank: blocksOf('-', '  Inside'),
    laterBlank: blocksOf('-', '  First', '', '  Next'),
  }).toEqual({
    paragraph: [{ kind: 'ul', items: [[]] }, p('Outside')],
    list: [{ kind: 'ul', items: [[], [p('inner')]] }],
    bulletSibling: [{ kind: 'ul', items: [[], [p('b')]] }],
    numberSibling: [{ kind: 'ol', start: 1, items: [[], [p('Second')]] }],
    noBlank: [{ kind: 'ul', items: [[p('Inside')]] }],
    laterBlank: [{ kind: 'ul', items: [[p('First'), p('Next')]] }],
  })
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
