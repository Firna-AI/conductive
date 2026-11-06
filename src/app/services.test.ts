// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { windowInput } from './services'

describe('windowInput', () => {
  test('hears each input on the page, also one that an element stops, until its cleanup', () => {
    const field = document.createElement('input')
    document.body.append(field)
    const events = [
      new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
      new InputEvent('beforeinput', { data: 'a', bubbles: true }),
      new PointerEvent('pointerdown', { bubbles: true }),
      new WheelEvent('wheel', { deltaY: 40, bubbles: true }),
    ]
    // A field of the app stops its events, as a text field does with keys.
    for (const event of events) {
      field.addEventListener(event.type, (stopped) => stopped.stopPropagation())
    }
    const heard: string[] = []
    let sent = ''
    const stop = windowInput(window)(() => heard.push(sent))
    for (const event of events) {
      sent = event.type
      field.dispatchEvent(event)
    }
    stop()
    sent = 'after the cleanup'
    field.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'b', bubbles: true }),
    )
    field.remove()
    expect(heard).toEqual(['keydown', 'beforeinput', 'pointerdown', 'wheel'])
  })
})
