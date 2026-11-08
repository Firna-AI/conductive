// @vitest-environment happy-dom

import { act, useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { FakeApiServer } from '../../test-support/fake-api'
import { click, mountScreen, press } from '../test-mount'
import { startedApp } from '../test-render'
import { ActionButton } from './actions'

/** A Save that turns off when it is pressed, as Save after a save does. */
function Saving(props: { pressed: () => void }) {
  const [off, setOff] = useState(false)
  return (
    <>
      <ActionButton
        disabled={off}
        keepFocus
        onPress={() => {
          props.pressed()
          setOff(true)
        }}
      >
        Save
      </ActionButton>
      <button type="button">Next</button>
    </>
  )
}

/** The state of a button as the page and assistive technology see it. */
function stateOf(button: HTMLButtonElement) {
  return {
    focused: document.activeElement === button,
    native: button.disabled,
    announced: button.closest('[aria-disabled="true"]') !== null,
    opacity: button.style.opacity,
  }
}

describe('ActionButton', () => {
  test('a button that turns off while it has the focus keeps it, looks and acts off, and is natively off when the focus leaves', async () => {
    let presses = 0
    const app = await startedApp(new FakeApiServer())
    const view = mountScreen(app, <Saving pressed={() => (presses += 1)} />)
    const [save, next] = Array.from(view.querySelectorAll('button'))
    if (!save || !next) throw new Error('The buttons are missing.')
    click(save)
    const held = stateOf(save)
    const look = save.getAttribute('style')
    press(save, 'Enter')
    press(save, ' ')
    act(() => save.click())
    const pressed = { presses, look: save.getAttribute('style') === look }
    // The window loses the focus, and the page keeps its focused element.
    const away = vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    act(() => {
      save.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    away.mockRestore()
    const windowBlur = stateOf(save)
    act(() => next.focus())
    expect({
      held,
      pressed,
      windowBlur,
      left: { ...stateOf(save), next: document.activeElement === next },
    }).toEqual({
      held: { focused: true, native: false, announced: true, opacity: '0.55' },
      pressed: { presses: 1, look: true },
      windowBlur: {
        focused: true,
        native: false,
        announced: true,
        opacity: '0.55',
      },
      left: {
        focused: false,
        native: true,
        announced: true,
        opacity: '0.55',
        next: true,
      },
    })
  })
})
