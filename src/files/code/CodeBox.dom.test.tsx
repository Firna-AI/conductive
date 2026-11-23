// @vitest-environment happy-dom

import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { mount } from '../../test-support/mount'
import { DiffView } from '../diff/DiffView'
import { CodeView } from './CodeView'

/** Mounts the element beside other page text, and finds its code box. */
async function mountBox(element: ReactNode) {
  const view = await mount(
    <>
      <p>page text</p>
      {element}
    </>,
  )
  const box = view.container.querySelector('[role=region]')
  const outside = view.container.querySelector('p')
  if (!box || !outside) throw new Error('No code box')
  return { box, outside }
}

/** Presses the key on the box, and returns whether React stopped it. */
function press(box: Element, init: KeyboardEventInit): boolean {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  })
  box.dispatchEvent(event)
  return event.defaultPrevented
}

/** Where the selection is after a press of select all on the box. */
function selectAll(box: Element, outside: Element, init: KeyboardEventInit) {
  document.getSelection()?.removeAllRanges()
  const stopped = press(box, { key: 'a', ...init })
  const range = document.getSelection()?.getRangeAt(0)
  return {
    stopped,
    inBox: range?.commonAncestorContainer === box,
    outside: range?.intersectsNode(outside) ?? false,
  }
}

/** Sends a copy at the box, and returns the text that it gives. */
function copy(box: Element): { prevented: boolean; text: string } {
  const clipboardData = new DataTransfer()
  const event = new ClipboardEvent('copy', {
    bubbles: true,
    cancelable: true,
    clipboardData,
  })
  box.dispatchEvent(event)
  return {
    prevented: event.defaultPrevented,
    text: clipboardData.getData('text/plain'),
  }
}

/** The text node of the line with `number`, in the text cell of its row. */
function lineNode(box: Element, number: number): Node {
  const cell = box.querySelectorAll('[data-copy-text]')[number - 1]
  const node = cell?.querySelector('span')?.firstChild
  if (!node) throw new Error(`No text on line ${number}`)
  return node
}

const selected = { stopped: true, inBox: true, outside: false }

describe('CodeBox select all', () => {
  it('selects only the code of a file, with Cmd+A or Ctrl+A', async () => {
    const { box, outside } = await mountBox(
      <CodeView name="a.ts" text={'one\ntwo'} />,
    )
    expect({
      meta: selectAll(box, outside, { metaKey: true }),
      ctrl: selectAll(box, outside, { ctrlKey: true }),
      tabIndex: box.getAttribute('tabindex'),
    }).toEqual({ meta: selected, ctrl: selected, tabIndex: '0' })
  })

  it('selects only the diff, with Cmd+A', async () => {
    const { box, outside } = await mountBox(
      <DiffView
        name="a.ts"
        newContent={null}
        oldContent={null}
        rows={[{ kind: 'added', text: 'one', oldLine: null, newLine: 1 }]}
      />,
    )
    expect({
      meta: selectAll(box, outside, { metaKey: true }),
      tabIndex: box.getAttribute('tabindex'),
    }).toEqual({ meta: selected, tabIndex: '0' })
  })

  it('leaves other keys to the browser', async () => {
    const { box } = await mountBox(<CodeView name="a.ts" text="one" />)
    expect([
      press(box, { key: 'a' }),
      press(box, { key: 'c', metaKey: true }),
      press(box, { key: 'a', metaKey: true, shiftKey: true }),
    ]).toEqual([false, false, false])
  })
})

describe('CodeBox copy', () => {
  it('copies the exact text of a file after select all', async () => {
    const texts = ['one\n\ntwo\n\n', 'one\r\ntwo', '\n']
    const copies = []
    for (const text of texts) {
      const { box, outside } = await mountBox(
        <CodeView name="a.txt" text={text} />,
      )
      selectAll(box, outside, { metaKey: true })
      copies.push(copy(box))
    }
    expect(copies).toEqual([
      { prevented: true, text: 'one\n\ntwo\n\n' },
      { prevented: true, text: 'one\ntwo' },
      { prevented: true, text: '\n' },
    ])
  })

  it('copies the selected part of each line, with its empty lines', async () => {
    const { box } = await mountBox(
      <CodeView name="a.txt" text={'one\n\ntwo\nthree\n'} />,
    )
    const range = document.createRange()
    range.setStart(lineNode(box, 1), 1)
    range.setEnd(lineNode(box, 3), 2)
    document.getSelection()?.removeAllRanges()
    document.getSelection()?.addRange(range)
    expect(copy(box)).toEqual({ prevented: true, text: 'ne\n\ntw' })
  })

  it('leaves the copy of a diff to the browser', async () => {
    const { box, outside } = await mountBox(
      <DiffView
        name="a.ts"
        newContent={null}
        oldContent={null}
        rows={[{ kind: 'added', text: 'one', oldLine: null, newLine: 1 }]}
      />,
    )
    selectAll(box, outside, { metaKey: true })
    expect(copy(box).prevented).toBe(false)
  })
})
