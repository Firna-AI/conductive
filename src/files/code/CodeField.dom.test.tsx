// @vitest-environment happy-dom

import { act, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { mount } from '../../test-support/mount'
import { CodeField } from './CodeField'
import fieldStyles from './CodeField.module.css'
import styles from './code.module.css'

/** A code field that keeps what the user types. */
function Field(props: { value: string }) {
  const [value, setValue] = useState(props.value)
  return (
    <CodeField
      label="Startup script"
      name="s.sh"
      onChange={setValue}
      value={value}
    />
  )
}

/** Presses `key` in `area`, and says whether the field kept the key. */
function press(area: HTMLTextAreaElement, key: string): boolean {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  })
  act(() => {
    area.dispatchEvent(event)
  })
  return event.defaultPrevented
}

/** The text of each coloured line of a code field. */
function shownLines(root: Element): string[] {
  return Array.from(
    root.querySelectorAll(`.${fieldStyles.line}`),
    (line) => line.textContent ?? '',
  )
}

describe('CodeField', () => {
  it('shows the lines in shell colours under the field, describes its keys, follows each change, and lets Escape, then Tab, leave', async () => {
    const view = await mount(<Field value={'# start\nexport A="b"'} />)
    const area = view.container.querySelector('textarea')
    if (!area) throw new Error('The field is missing.')
    expect({
      label: area.getAttribute('aria-label'),
      keys: document.getElementById(area.getAttribute('aria-describedby') ?? '')
        ?.textContent,
      lines: shownLines(view.container),
      comment: view.container.querySelector(`.${styles.comment}`)?.textContent,
      keyword: view.container.querySelector(`.${styles.keyword}`)?.textContent,
      string: view.container.querySelector(`.${styles.string}`)?.textContent,
    }).toEqual({
      label: 'Startup script',
      keys: 'Tab indents and Shift+Tab outdents. To leave the field, press Escape, then Tab.',
      lines: ['# start\n', 'export A="b"'],
      comment: '# start',
      keyword: 'export',
      string: '"b"',
    })
    act(() => {
      area.focus()
      area.setSelectionRange(area.value.length, area.value.length)
    })
    const kept = press(area, 'Tab')
    expect({
      kept,
      value: area.value,
      lines: shownLines(view.container),
      caret: area.selectionStart,
    }).toEqual({
      kept: true,
      value: '# start\nexport A="b"  ',
      lines: ['# start\n', 'export A="b"  '],
      caret: 22,
    })
    // Escape, then Tab, leaves Tab to the browser, which moves the focus.
    press(area, 'Escape')
    expect({ kept: press(area, 'Tab'), value: area.value }).toEqual({
      kept: false,
      value: '# start\nexport A="b"  ',
    })
  })
})
