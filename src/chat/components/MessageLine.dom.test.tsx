// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import toolGroup from '../../../docs/mockups/src/components/chat/ToolGroup.module.css'
import a11y from '../../../docs/mockups/src/components/common/a11y.module.css'
import { accessibleName } from '../../test-support/dom-queries'
import { mount, press } from '../../test-support/mount'
import {
  MentionsProvider,
  type ChatMentions,
} from '../mentions/MentionsContext'
import { MessageLine } from './MessageLine'

/** The text of a node, with each run of white space as one space. */
function textOf(node: Node | null): string {
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

it('shows each heading of a closed message line as text of the line in the heading weight, with no heading element, and draws no empty heading', () => {
  const page = document.createElement('div')
  page.innerHTML = renderToStaticMarkup(
    <MessageLine
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

it('keeps the closed text as the name of an open line whose table comes after an empty heading', async () => {
  const text = [
    '## ',
    '| Workers | Time |',
    '| ---: | ---: |',
    '| 4 | 3m 10s |',
  ]
  const view = await mount(<MessageLine text={text.join('\n')} />)
  const line = view.container.querySelector('summary')
  if (!line) throw new Error('The message has no line')
  await press(line)
  expect(accessibleName(line)).toBe('Workers · Time · 4 · 3m 10s')
})

it('shows file chips in the open line, and none in its hidden copy', async () => {
  const entry = {
    path: 'src/app.ts',
    name: 'app.ts',
    kind: 'file' as const,
    change: null,
  }
  const snapshot = {
    tree: { entries: new Map([[entry.path, entry]]) },
    treeError: null,
    treeUnavailable: false,
  }
  const mentions: ChatMentions = {
    files: { subscribe: () => () => undefined, getSnapshot: () => snapshot },
    openFile: () => undefined,
    showFolder: () => undefined,
    href: (item) => `/files/${item.path}`,
  }
  const text = [
    '## ',
    '| File | Note |',
    '| --- | --- |',
    '| @src/app.ts:4 | Read |',
  ]
  const view = await mount(
    <MentionsProvider value={mentions}>
      <MessageLine text={text.join('\n')} />
    </MentionsProvider>,
  )
  const line = view.container.querySelector('summary')
  if (!line) throw new Error('The message has no line')
  await press(line)
  const hidden = line.querySelector(`:scope > span > .${a11y.hidden}`)
  expect({
    hidden: hidden?.querySelectorAll('a').length,
    hiddenText: textOf(hidden),
    shown: view.container.querySelectorAll('table a').length,
  }).toEqual({
    hidden: 0,
    hiddenText: 'File · Note · @src/app.ts:4 · Read',
    shown: 1,
  })
})
