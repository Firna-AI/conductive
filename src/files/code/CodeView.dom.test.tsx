// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '../../test-support/mount'
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
