// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import line from '../../ui/components/chat/MessageLine.module.css'
import prose from '../../ui/components/common/MarkdownProse.module.css'
import { mount, press } from '../../test-support/mount'
import { AgentText } from './AgentText'
import { MessageLine } from './MessageLine'

/** The text of a node, with each run of white space as one space. */
function textOf(node: Node | null | undefined): string {
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** Each element in a short form: its tag, and its text when it has no element. */
function outline(parent: Element): string[] {
  return Array.from(parent.children, (child) =>
    child.children.length === 0 || child.tagName === 'P'
      ? `${child.tagName} ${textOf(child)}`.trim()
      : `${child.tagName} [${outline(child).join(', ')}]`,
  )
}

const answer = [
  'Priya left two comments:',
  '',
  '> Each key press sends a lookup. Can we wait until the person *stops* typing?',
  '>',
  '> - Wait 250 ms.',
  '',
  '---',
  '',
  '~~Hide the fields.~~ She tested with this address:<br>221B Baker Street<br>London NW1 6XE',
].join('\n')

it('draws quotes with their blocks, rules, emphasis, strikethrough, and line breaks in an answer, with the shared prose style', () => {
  const page = document.createElement('div')
  page.innerHTML = renderToStaticMarkup(
    <AgentText id="agent:1" text={answer} />,
  )
  const root = page.firstElementChild
  if (!root) throw new Error('The answer has no element')
  expect({
    prose: root.classList.contains(prose.prose),
    blocks: outline(root),
    emphasis: textOf(root.querySelector('blockquote em')),
    strike: textOf(root.querySelector('p > del')),
    lines: Array.from(root.querySelectorAll('p:last-child'), (block) =>
      Array.from(block.childNodes, (node) =>
        node.nodeName === 'BR' ? 'BR' : textOf(node),
      ),
    ),
  }).toEqual({
    prose: true,
    blocks: [
      'P Priya left two comments:',
      'BLOCKQUOTE [P Each key press sends a lookup. Can we wait until the person stops typing?, UL [LI Wait 250 ms.]]',
      'HR',
      'P Hide the fields. She tested with this address:221B Baker StreetLondon NW1 6XE',
    ],
    emphasis: 'stops',
    strike: 'Hide the fields.',
    lines: [
      [
        'Hide the fields.',
        'She tested with this address:',
        'BR',
        '221B Baker Street',
        'BR',
        'London NW1 6XE',
      ],
    ],
  })
})

it('shows a quote, a rule, and a line break of a message line in the line, closed and open, as spans with a space before each break', async () => {
  const view = await mount(<MessageLine id="agent:1" text={answer} />)
  const details = view.container.querySelector('details')
  const summary = details?.querySelector('summary')
  if (!details || !summary) throw new Error('The message has no line')
  const shown = () => ({
    elements: summary.querySelectorAll('blockquote, hr, p, ul, li').length,
    quote: Array.from(
      summary.querySelectorAll(`.${line.quote}.${prose.quote}`),
      textOf,
    ),
    rules: summary.querySelectorAll(`span.${line.rule}.${prose.rule}`).length,
    breaks: Array.from(
      summary.querySelectorAll('br'),
      (br) => br.previousSibling?.textContent,
    ),
    text: textOf(summary),
  })
  const closed = shown()
  await press(summary)
  expect({
    styles: [line.message, prose.prose].every((name) =>
      details.classList.contains(name),
    ),
    closed,
    open: details.open ? shown() : null,
  }).toEqual({
    styles: true,
    closed: {
      elements: 0,
      quote: [
        'Each key press sends a lookup. Can we wait until the person stops typing? Wait 250 ms.',
      ],
      rules: 1,
      breaks: [' ', ' '],
      text: 'Priya left two comments: Each key press sends a lookup. Can we wait until the person stops typing? Wait 250 ms. Hide the fields. She tested with this address: 221B Baker Street London NW1 6XE',
    },
    open: closed,
  })
})

it('opens a quote that holds the first table of a message under its line, and keeps the text before it in the line', async () => {
  const text = [
    'The sizes:',
    '',
    '> | Bundle | Size |',
    '> | --- | --- |',
    '> | checkout | 182 KB |',
    '',
    '---',
  ].join('\n')
  const view = await mount(<MessageLine id="agent:1" text={text} />)
  const summary = view.container.querySelector('summary')
  if (!summary) throw new Error('The message has no line')
  const closed = textOf(summary)
  await press(summary)
  const body = view.container.querySelector('details > div')
  expect({
    closed,
    open: textOf(summary),
    body: body ? outline(body) : [],
  }).toEqual({
    closed: 'The sizes: Bundle · Size · checkout · 182 KB',
    open: 'The sizes:',
    body: [
      'BLOCKQUOTE [DIV [TABLE [THEAD [TR [TH Bundle, TH Size]], TBODY [TR [TD checkout, TD 182 KB]]]]]',
      'HR',
    ],
  })
})
