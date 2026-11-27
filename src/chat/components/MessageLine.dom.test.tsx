// @vitest-environment happy-dom
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import codeStyles from '../../files/code/code.module.css'
import lineBlocks from '../../ui/components/chat/LineBlocks.module.css'
import toolGroup from '../../ui/components/chat/ToolGroup.module.css'
import a11y from '../../ui/components/common/a11y.module.css'
import { accessibleName } from '../../test-support/dom-queries'
import { mount, press } from '../../test-support/mount'
import { chatFiles } from '../chat-files-test-kit'
import {
  MentionsProvider,
  type ChatMentions,
} from '../mentions/MentionsContext'
import { FakeSkills } from '../mentions/skills-test-kit'
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
        '## ![](x)',
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

it('shows a code block of a closed line as plain text in the line, and of an open line in the colours of its fence label, as an answer does', async () => {
  const code = 'fn main() {\n\tlet greeting = "hi";\n}'
  const text = ['Run this:', '', '```rust', code, '```'].join('\n')
  const keywords = (root: ParentNode | null) =>
    Array.from(
      root?.querySelectorAll(`.${codeStyles.keyword}`) ?? [],
      (element) => element.textContent,
    )
  const page = document.createElement('div')
  page.innerHTML = renderToStaticMarkup(
    <MessageLine id="agent:1" text={text} />,
  )
  const closed = page.querySelector('summary')
  const open = await openLine(<MessageLine id="agent:1" text={text} />)
  expect({
    closed: { keywords: keywords(closed), line: textOf(closed) },
    open: {
      keywords: keywords(open),
      code: open.querySelector(`.${lineBlocks.code}`)?.textContent,
    },
  }).toEqual({
    closed: {
      keywords: [],
      line: 'Run this: fn main() { let greeting = "hi"; }',
    },
    open: { keywords: ['fn', 'let'], code },
  })
})

it('keeps the closed text as the name of an open line only when the blocks before its table show no text: empty headings, headings of white-space code, or an empty code block, and shows a mark without its pair as typed in the line', async () => {
  const table = ['| Workers | Time |', '| ---: | ---: |', '| 4 | 3m 10s |']
  // Each lead opens in a line of its own, so each case fails on its own.
  const leads = {
    empty: ['## ', '## ` `'],
    emptyCode: ['```', '```'],
    // An image with no alt text that opens nothing shows no words.
    image: ['![](x)'],
    imageHeading: ['## ![](x)'],
    headings: ['## ', '## **', '### `', '**', '---'],
    boldMarks: ['**'],
    // A blank line ends each list, because a table line right under an
    // item continues the text of the item, as CommonMark reads it.
    bullets: ['- **', ''],
    numbers: ['1. **', ''],
    codeMarks: ['```', '**', '```'],
  }
  const names: Record<string, string> = {}
  for (const [lead, lines] of Object.entries(leads)) {
    const text = [...lines, ...table].join('\n')
    const line = await openLine(<MessageLine id="agent:1" text={text} />)
    names[lead] = accessibleName(line)
  }
  expect(names).toEqual({
    empty: 'Workers · Time · 4 · 3m 10s',
    emptyCode: 'Workers · Time · 4 · 3m 10s',
    image: 'Workers · Time · 4 · 3m 10s',
    imageHeading: 'Workers · Time · 4 · 3m 10s',
    // A mark without its pair is text, so these leads name the line.
    headings: '** ` **',
    boldMarks: '**',
    bullets: '**',
    // The line writes the number of each item, which names the line too.
    numbers: '1. **',
    // A code block shows its text as the agent wrote it.
    codeMarks: '**',
  })
})

it('shows file chips in the open line, and nothing that takes focus in its hidden copy, after an empty heading or an empty code block, and no hidden copy after a mark as typed', async () => {
  const entry = {
    path: 'src/app.ts',
    name: 'app.ts',
    kind: 'file' as const,
    change: null,
  }
  const { files } = await chatFiles([entry])
  const mentions: ChatMentions = {
    files,
    skills: new FakeSkills({ claude: [], codex: [] }),
    openFile: () => undefined,
    showFolder: () => undefined,
    href: (item) => `/files/${item.path}`,
  }
  const table = ['| File | Note |', '| --- | --- |', '| @src/app.ts:4 | Read |']
  const leads = {
    heading: ['## '],
    boldMarks: ['**'],
    emptyCode: ['```', '```'],
    image: ['![](x)'],
    imageHeading: ['## ![](x)'],
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
  // A mark without its pair shows as typed, so it names the line, which
  // then needs no hidden copy.
  const named = { hidden: undefined, hiddenText: '', shown: 1 }
  expect(copies).toEqual({
    heading: copy,
    boldMarks: named,
    emptyCode: copy,
    image: copy,
    imageHeading: copy,
  })
})
