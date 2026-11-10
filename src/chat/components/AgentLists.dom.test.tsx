// @vitest-environment happy-dom
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import toolGroup from '../../../docs/mockups/src/components/chat/ToolGroup.module.css'
import { mount, press } from '../../test-support/mount'
import { textBlocks, type TextBlock } from './agent-text'
import { AgentText } from './AgentText'
import { MessageLine } from './MessageLine'

/** An answer or a message line as the chat draws it, in a readable page. */
function render(element: ReactElement): HTMLElement {
  const page = document.createElement('div')
  page.innerHTML = renderToStaticMarkup(element)
  return page
}

/** The number that a browser shows before an item of a numbered list. */
function numberOf(item: Element): number {
  const list = item.parentElement
  const start = Number(list?.getAttribute('start') ?? '1')
  return start + Array.from(list?.children ?? []).indexOf(item)
}

/** Text with each run of white space as one space. */
function squash(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** The text of a node, with each run of white space as one space. */
function textOf(node: Node | null): string {
  return squash(node?.textContent ?? '')
}

/** A paragraph block of an answer. */
function p(paragraph: string): TextBlock {
  return { kind: 'p', text: paragraph }
}

/** An item as its own text, or as its text and the lists inside it. */
type Outline = string | (string | Outline[])[]

/** Whether a node is a list. */
type IsList = (node: Node) => node is Element

/** The items of a list, each with the lists that it holds. */
function outline(list: Element, isList: IsList): Outline[] {
  return Array.from(list.children, (item) => {
    const nodes = Array.from(item.childNodes)
    const own = nodes.filter((node) => !isList(node))
    const text = squash(own.map(textOf).join(' '))
    const lists = nodes.filter(isList)
    if (lists.length === 0) return text
    return [text, ...lists.map((child) => outline(child, isList))]
  })
}

const isElementList: IsList = (node): node is Element =>
  node instanceof Element && (node.tagName === 'UL' || node.tagName === 'OL')
const isLineList: IsList = (node): node is Element =>
  node instanceof Element && node.classList.contains(toolGroup.bullets)

it('numbers each item of a numbered list from the number of its first item, in an answer and in a message line', () => {
  const text = [
    '1. **Position in the list** (low severity). Bowser now sits alone.',
    '   - a. Third, after Bookfolio.',
    '   - b. First.',
    '2. **Line and colour** (low severity).',
    '3. **Commit** (medium severity).',
    '',
    'Then:',
    '',
    '4. Push the branch.',
    '',
    '1234567890. That is the number of the order.',
  ].join('\n')
  const answer = render(<AgentText text={text} />)
  const message = render(<MessageLine text={text} />)
  expect({
    answer: Array.from(answer.querySelectorAll('ol > li'), numberOf),
    line: textOf(message.querySelector('summary')),
  }).toEqual({
    answer: [1, 2, 3, 4],
    line: [
      '1. Position in the list (low severity). Bowser now sits alone.',
      'a. Third, after Bookfolio. b. First.',
      '2. Line and colour (low severity). 3. Commit (medium severity).',
      'Then: 4. Push the branch.',
      '1234567890. That is the number of the order.',
    ].join(' '),
  })
})

it('nests a list that the agent indents under an item, in an answer and in a message line', () => {
  const text = [
    '1. **Position in the list** (low severity). Bowser now sits alone.',
    '   - a. Third, after Bookfolio.',
    '   - **Recommended: a.**',
    '2. **Line and colour** (low severity).',
    '3. **Commit** (medium severity).',
    '   - a. Give me a name and an email.',
  ].join('\n')
  const answer = render(<AgentText text={text} />)
  const message = render(<MessageLine text={text} />)
  const first = (page: HTMLElement, selector: string) =>
    page.querySelector(selector) ?? page
  expect({
    answer: outline(first(answer, 'ol'), isElementList),
    line: outline(first(message, `.${toolGroup.bullets}`), isLineList),
  }).toEqual({
    answer: [
      [
        'Position in the list (low severity). Bowser now sits alone.',
        ['a. Third, after Bookfolio.', 'Recommended: a.'],
      ],
      'Line and colour (low severity).',
      ['Commit (medium severity).', ['a. Give me a name and an email.']],
    ],
    line: [
      [
        '1. Position in the list (low severity). Bowser now sits alone.',
        ['a. Third, after Bookfolio.', 'Recommended: a.'],
      ],
      '2. Line and colour (low severity).',
      ['3. Commit (medium severity).', ['a. Give me a name and an email.']],
    ],
  })
})

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

it('opens the list that holds the first table of a message under its line, and keeps the text before it in the line', async () => {
  const text = [
    'The sizes:',
    '- Bundles:',
    '  | Bundle | Size |',
    '  | --- | --- |',
    '  | checkout | 182 KB |',
    '- Memory stays under 5 GiB.',
  ].join('\n')
  const view = await mount(<MessageLine text={text} />)
  const summary = view.container.querySelector('summary')
  if (!summary) throw new Error('The message has no line')
  await press(summary)
  const body = view.container.querySelector('details > div')
  expect({
    line: textOf(summary),
    tables: summary.querySelectorAll('table').length,
    items: Array.from(body?.querySelectorAll('ul > li') ?? [], (item) => ({
      text: textOf(item.firstChild),
      rows: Array.from(item.querySelectorAll('tr'), (row) =>
        Array.from(row.children, textOf),
      ),
    })),
  }).toEqual({
    line: 'The sizes:',
    tables: 0,
    items: [
      {
        text: 'Bundles:',
        rows: [
          ['Bundle', 'Size'],
          ['checkout', '182 KB'],
        ],
      },
      { text: 'Memory stays under 5 GiB.', rows: [] },
    ],
  })
})
