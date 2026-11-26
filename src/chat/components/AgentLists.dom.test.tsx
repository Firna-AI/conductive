// @vitest-environment happy-dom
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import messageLine from '../../ui/components/chat/MessageLine.module.css'
import toolGroup from '../../ui/components/chat/ToolGroup.module.css'
import prose from '../../ui/components/common/MarkdownProse.module.css'
import { accessibleName } from '../../test-support/dom-queries'
import { mount, press } from '../../test-support/mount'
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
  const answer = render(<AgentText id="agent:1" text={text} />)
  const message = render(<MessageLine id="agent:1" text={text} />)
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
  const answer = render(<AgentText id="agent:1" text={text} />)
  const message = render(<MessageLine id="agent:1" text={text} />)
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

it('draws each task box as a fixed check box in the shared look before the words of its task, in an answer and in a message line, and names the state of each box of the line', () => {
  const text = [
    'The review changes:',
    '- [x] Wait 250 ms after the last key press.',
    '- [ ] Approval of Priya',
    '  - She checks the phone layout.',
    '- \\[x] An escaped box stays text.',
  ].join('\n')
  const answer = render(<AgentText id="agent:1" text={text} />)
  const message = render(<MessageLine id="agent:1" text={text} />)
  const boxOf = (box: HTMLInputElement) => ({
    checked: box.checked,
    disabled: box.disabled,
    look: box.classList.contains(prose.taskBox),
    words: textOf(box.parentElement),
  })
  expect({
    answer: Array.from(answer.querySelectorAll('input'), (box) => ({
      ...boxOf(box),
      task: box.closest('li')?.classList.contains(prose.task),
      start: box.parentElement?.firstChild === box,
    })),
    nested: textOf(answer.querySelector(`li.${prose.task} > ul`)),
    line: textOf(message.querySelector('summary')),
    boxes: Array.from(
      message.querySelectorAll<HTMLInputElement>('summary input'),
      (box) => ({
        ...boxOf(box),
        name: accessibleName(box),
        task: box.parentElement?.classList.contains(messageLine.task),
      }),
    ),
  }).toEqual({
    answer: [
      {
        checked: true,
        disabled: true,
        look: true,
        words: 'Wait 250 ms after the last key press.',
        task: true,
        start: true,
      },
      {
        checked: false,
        disabled: true,
        look: true,
        words: 'Approval of Priya',
        task: true,
        start: true,
      },
    ],
    nested: 'She checks the phone layout.',
    line: [
      'The review changes: Wait 250 ms after the last key press.',
      'Approval of Priya She checks the phone layout.',
      '[x] An escaped box stays text.',
    ].join(' '),
    boxes: [
      {
        checked: true,
        disabled: true,
        look: true,
        words: 'Wait 250 ms after the last key press.',
        name: 'done',
        task: true,
      },
      {
        checked: false,
        disabled: true,
        look: true,
        words: 'Approval of Priya She checks the phone layout.',
        name: 'not done',
        task: true,
      },
    ],
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
  const view = await mount(<MessageLine id="agent:1" text={text} />)
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
