// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '../../test-support/mount'
import { DiffView } from '../diff/DiffView'
import { CodeView } from './CodeView'
import styles from './code.module.css'

const text = Array.from({ length: 40 }, (_, index) => `line ${index + 1}`)

/** The numbers of the marked lines of a code view. */
function markedNumbers(root: Element): string[] {
  return Array.from(
    root.querySelectorAll(`.${styles.marked} .${styles.number}`),
    (number) => number.textContent ?? '',
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CodeView with marked lines', () => {
  it('marks the lines and scrolls the first one to the middle', async () => {
    // Each line is 20 px high, and the view shows 100 px.
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(20)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        const number = this.querySelector(`.${styles.number}`)?.textContent
        const top = this.classList.contains(styles.line)
          ? (Number(number) - 1) * 20
          : 0
        return new DOMRect(0, top, 100, 20)
      },
    )
    const view = await mount(
      <CodeView
        marked={{ range: { start: 30, end: 32 }, visit: 0 }}
        name="a.ts"
        text={text.join('\n')}
      />,
    )
    const scroll = view.container.querySelector(`.${styles.scroll}`)
    expect({
      marked: markedNumbers(view.container),
      top: scroll?.scrollTop,
    }).toEqual({ marked: ['30', '31', '32'], top: 580 - 40 })
  })

  it('stops a range at the end of the file, and marks nothing past it', async () => {
    const short = await mount(
      <CodeView
        marked={{ range: { start: 39, end: 60 }, visit: 0 }}
        name="a.ts"
        text={text.join('\n')}
      />,
    )
    const past = await mount(
      <CodeView
        marked={{ range: { start: 41, end: 41 }, visit: 0 }}
        name="a.ts"
        text={text.join('\n')}
      />,
    )
    expect({
      short: markedNumbers(short.container),
      past: markedNumbers(past.container),
    }).toEqual({ short: ['39', '40'], past: [] })
  })
})

describe('CodeView select all', () => {
  /** Presses the key on the code box, and returns whether React stopped it. */
  function press(box: Element, init: KeyboardEventInit): boolean {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ...init,
    })
    box.dispatchEvent(event)
    return event.defaultPrevented
  }

  it('selects the code only, with Cmd+A or Ctrl+A', async () => {
    const outside = document.createElement('p')
    outside.textContent = 'page text'
    document.body.append(outside)
    const view = await mount(<CodeView name="a.ts" text="one\ntwo" />)
    const box = view.container.querySelector(`.${styles.scroll}`)
    if (!box) throw new Error('No code box')
    const results = [{ metaKey: true }, { ctrlKey: true }].map((modifier) => {
      document.getSelection()?.removeAllRanges()
      const stopped = press(box, { key: 'a', ...modifier })
      const range = document.getSelection()?.getRangeAt(0)
      return {
        stopped,
        inBox: range?.commonAncestorContainer === box,
        outside: range?.intersectsNode(outside) ?? false,
      }
    })
    outside.remove()
    const expected = { stopped: true, inBox: true, outside: false }
    expect(results).toEqual([expected, expected])
    expect(box.getAttribute('tabindex')).toBe('0')
  })

  it('leaves other keys to the browser', async () => {
    const view = await mount(<CodeView name="a.ts" text="one" />)
    const box = view.container.querySelector(`.${styles.scroll}`)
    if (!box) throw new Error('No code box')
    expect([
      press(box, { key: 'a' }),
      press(box, { key: 'c', metaKey: true }),
      press(box, { key: 'a', metaKey: true, shiftKey: true }),
    ]).toEqual([false, false, false])
  })
})

describe('Empty lines', () => {
  /** The text of each line, as a copy of a selection reads it. */
  function lineTexts(root: Element): string[] {
    return Array.from(
      root.querySelectorAll(`.${styles.text}`),
      (text) => text.textContent ?? '',
    )
  }

  it('keeps a line break in an empty line of a file and of a diff', async () => {
    const code = await mount(<CodeView name="a.ts" text={'one\n\ntwo'} />)
    const diff = await mount(
      <DiffView
        name="a.ts"
        newContent={null}
        oldContent={null}
        rows={[
          { kind: 'added', text: 'one', oldLine: null, newLine: 1 },
          { kind: 'added', text: '', oldLine: null, newLine: 2 },
        ]}
      />,
    )
    expect({
      code: lineTexts(code.container),
      diff: lineTexts(diff.container),
    }).toEqual({ code: ['one', '\n', 'two'], diff: ['one', '\n'] })
  })
})
