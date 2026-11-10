// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { keepPlainPresses, type ForcedSelectionKey } from './plainPresses'

/** The fields of a press that xterm.js reads. */
function fields(event: MouseEvent) {
  return {
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    button: event.button,
    buttons: event.buttons,
    detail: event.detail,
    clientX: event.clientX,
    clientY: event.clientY,
  }
}

/**
 * A screen with a row in it. A listener of the screen stands in for
 * xterm.js, and records each press that reaches it.
 */
function screenWithRule(forceKey: ForcedSelectionKey, programHasMouse = true) {
  const screen = document.createElement('div')
  const row = document.createElement('span')
  screen.append(row)
  document.body.append(screen)
  const seen: {
    target: EventTarget | null
    press: ReturnType<typeof fields>
  }[] = []
  screen.addEventListener('mousedown', (event) =>
    seen.push({ target: event.target, press: fields(event) }),
  )
  const stop = keepPlainPresses(screen, () => programHasMouse, forceKey)
  return { row, seen, stop }
}

function press(target: EventTarget, init: MouseEventInit): void {
  target.dispatchEvent(
    new MouseEvent('mousedown', { bubbles: true, cancelable: true, ...init }),
  )
}

const plainDoubleClick = {
  button: 0,
  buttons: 1,
  detail: 2,
  clientX: 40,
  clientY: 12,
}

describe('keepPlainPresses', () => {
  it('sends a plain left press again as a forced selection while a program has the mouse', () => {
    const mac = screenWithRule('altKey')
    const other = screenWithRule('shiftKey')

    press(mac.row, plainDoubleClick)
    press(other.row, plainDoubleClick)

    const expected = {
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      ...plainDoubleClick,
    }
    expect(mac.seen).toEqual([
      { target: mac.row, press: { ...expected, altKey: true } },
    ])
    expect(other.seen).toEqual([
      { target: other.row, press: { ...expected, shiftKey: true } },
    ])
  })

  it('passes a press with a modifier, a right or middle press, and each press while no program has the mouse', () => {
    const cases: {
      name: string
      init: MouseEventInit
      programHasMouse?: boolean
    }[] = [
      { name: 'Cmd', init: { button: 0, metaKey: true } },
      { name: 'Ctrl', init: { button: 0, ctrlKey: true } },
      { name: 'Option', init: { button: 0, altKey: true } },
      { name: 'Shift', init: { button: 0, shiftKey: true } },
      { name: 'right', init: { button: 2 } },
      { name: 'middle', init: { button: 1 } },
      { name: 'no mouse', init: { button: 0 }, programHasMouse: false },
    ]

    for (const { name, init, programHasMouse } of cases) {
      const { row, seen } = screenWithRule('altKey', programHasMouse)
      press(row, init)
      const sent = fields(new MouseEvent('mousedown', init))
      expect({ name, seen }).toEqual({
        name,
        seen: [{ target: row, press: sent }],
      })
    }
  })

  it('passes each press after it stops', () => {
    const { row, seen, stop } = screenWithRule('altKey')

    stop()
    press(row, plainDoubleClick)

    expect(seen.map(({ press }) => press.altKey)).toEqual([false])
  })
})
