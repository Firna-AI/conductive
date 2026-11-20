// @vitest-environment happy-dom
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import toolGroup from '../../../docs/mockups/src/components/chat/ToolGroup.module.css'
import a11y from '../../../docs/mockups/src/components/common/a11y.module.css'
import { accessibleName } from '../../test-support/dom-queries'
import { mount, press } from '../../test-support/mount'
import { chatFiles } from '../chat-files-test-kit'
import {
  MentionsProvider,
  type ChatMentions,
} from '../mentions/MentionsContext'
import { MessageLine } from './MessageLine'

/** The text of a node, with each run of white space as one space. */
function textOf(node: Node | null): string {
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** Mounts the element, presses its message line open, and gives the line. */
async function openLine(element: ReactNode): Promise<HTMLElement> {
  const view = await mount(element)
  const line = view.container.querySelector('summary')
  if (!line) throw new Error('The message has no line')
  await press(line)
  return line
}

/** Each element that can take focus, and each link. */
const focusable = 'a, button, input, select, textarea, [tabindex]'

it('shows each heading of a closed message line as text of the line in the heading weight, with no heading element, and draws no empty heading', () => {
  const page = document.createElement('div')
  page.innerHTML = renderToStaticMarkup(
    <MessageLine
      id="agent:1"
      text={[
        '## Plan',
        '- Wait 250 ms after the last key press.',
        '### Then',
        'Run the checkout tests.',
        '## ',
      ].join('\n')}
    />,
  )
  const line = page.querySelector('summary')
  expect({
    line: textOf(line),
    headings: Array.from(
      line?.querySelectorAll(`.${toolGroup.heading}`) ?? [],
      textOf,
    ),
    elements: line?.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
  }).toEqual({
    line: 'Plan Wait 250 ms after the last key press. Then Run the checkout tests.',
    headings: ['Plan', 'Then'],
    elements: 0,
  })
})

it('keeps the closed text as the name of an open line only when the blocks before its table show no text: empty headings, formatting marks alone, an empty code block, or bullets of such items', async () => {
  const table = ['| Workers | Time |', '| ---: | ---: |', '| 4 | 3m 10s |']
  // Each lead opens in a line of its own, so each case fails on its own.
  const leads = {
    headings: ['## ', '## **', '### `', '**', '---'],
    boldMarks: ['**'],
    emptyCode: ['```', '```'],
    bullets: ['- **'],
    numbers: ['1. **'],
    codeMarks: ['```', '**', '```'],
  }
  const names: Record<string, string> = {}
  for (const [lead, lines] of Object.entries(leads)) {
    const text = [...lines, ...table].join('\n')
    const line = await openLine(<MessageLine id="agent:1" text={text} />)
    names[lead] = accessibleName(line)
  }
  expect(names).toEqual({
    headings: 'Workers · Time · 4 · 3m 10s',
    boldMarks: 'Workers · Time · 4 · 3m 10s',
    emptyCode: 'Workers · Time · 4 · 3m 10s',
    bullets: 'Workers · Time · 4 · 3m 10s',
    // The line writes the number of each item, which names the line.
    numbers: '1.',
    // A code block shows its text as the agent wrote it.
    codeMarks: '**',
  })
})

it('shows file chips in the open line, and nothing that takes focus in its hidden copy, after an empty heading, bold marks alone, or an empty code block', async () => {
  const entry = {
    path: 'src/app.ts',
    name: 'app.ts',
    kind: 'file' as const,
    change: null,
  }
  const { files } = await chatFiles([entry])
  const mentions: ChatMentions = {
    files,
    openFile: () => undefined,
    showFolder: () => undefined,
    href: (item) => `/files/${item.path}`,
  }
  const table = ['| File | Note |', '| --- | --- |', '| @src/app.ts:4 | Read |']
  const leads = {
    heading: ['## '],
    boldMarks: ['**'],
    emptyCode: ['```', '```'],
  }
  const copies: Record<string, unknown> = {}
  for (const [lead, lines] of Object.entries(leads)) {
    const line = await openLine(
      <MentionsProvider value={mentions}>
        <MessageLine id="agent:1" text={[...lines, ...table].join('\n')} />
      </MentionsProvider>,
    )
    const hidden = line.querySelector(`:scope > span > .${a11y.hidden}`)
    copies[lead] = {
      hidden: hidden?.querySelectorAll(focusable).length,
      hiddenText: textOf(hidden),
      shown: line.parentElement?.querySelectorAll('table a').length,
    }
  }
  const copy = {
    hidden: 0,
    hiddenText: 'File · Note · @src/app.ts:4 · Read',
    shown: 1,
  }
  expect(copies).toEqual({ heading: copy, boldMarks: copy, emptyCode: copy })
})
