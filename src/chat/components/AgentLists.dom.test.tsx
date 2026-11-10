// @vitest-environment happy-dom
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
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

/** The text of an element, with each run of white space as one space. */
function textOf(element: Element | null): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

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
    '1234567890. That is the number of the order.',
  ].join('\n')
  const answer = render(<AgentText text={text} />)
  const line = render(<MessageLine text={text} />)
  expect({
    answer: Array.from(answer.querySelectorAll('ol > li'), numberOf),
    line: textOf(line.querySelector('summary')),
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
