import { onTestFinished, vi } from 'vitest'
import { layOut } from '../test-support/layout'

/** Whether an element is the measure element of xterm.js, with 32 letters. */
function measuresCells(element: HTMLElement): boolean {
  return element.classList.contains('xterm-char-measure-element')
}

/**
 * A terminal host of the size of the tools panel of the right column, 440 ×
 * 389 pixels, in a column that hides it. happy-dom lays out no text, so each
 * cell of xterm.js measures 10 × 20 pixels here. The screen has no padding,
 * so a fit of the host gives 42 columns and 19 rows: 14 of the 440 pixels
 * hold the scrollbar of xterm.js. The column goes at the end of the test.
 */
export function hiddenHost(): { column: HTMLElement; host: HTMLElement } {
  layOut('.host', { width: 440, height: 389 })
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(
    function (this: HTMLElement) {
      return measuresCells(this) ? 32 * 10 : 0
    },
  )
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
    function (this: HTMLElement) {
      return measuresCells(this) ? 20 : 0
    },
  )
  const column = document.createElement('div')
  column.hidden = true
  const host = document.createElement('div')
  host.className = 'host'
  // The fit reads the size of the host and the padding of the screen from
  // their styles. The test page loads no style sheet of xterm.js.
  host.style.width = '440px'
  host.style.height = '389px'
  const padding = document.createElement('style')
  padding.textContent = '.xterm { padding: 0; }'
  column.append(padding, host)
  document.body.append(column)
  onTestFinished(() => {
    column.remove()
    vi.restoreAllMocks()
  })
  return { column, host }
}
