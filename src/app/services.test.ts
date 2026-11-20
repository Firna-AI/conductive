// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  windowInput,
  windowKeys,
  windowLayoutModifiers,
  type KeyPress,
} from './services'

const pageAddress = window.location.href

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.location.href = pageAddress
})

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

test('window keys hold a layout modifier until its own keyup or blur and share it with the recorder', () => {
  const heard: KeyPress['layoutModifiers'][] = []
  const hear = (press: KeyPress) => {
    if (press.code === 'Digit1') heard.push(press.layoutModifiers)
  }
  let stop = windowKeys(window)(hear)
  const send = (type: string, key: string, code: string) =>
    window.dispatchEvent(new KeyboardEvent(type, { key, code }))
  const digit = () => send('keydown', '1', 'Digit1')
  try {
    send('keydown', 'GroupNext', 'ShiftLeft')
    digit()
    const recorder = windowKeys(window).layoutModifiers()
    stop()
    stop = windowKeys(window)(hear)
    digit()
    send('keyup', 'Alt', 'AltLeft')
    digit()
    send('keyup', 'Shift', 'ShiftLeft')
    digit()
    send('keydown', 'GroupNext', 'ShiftLeft')
    window.dispatchEvent(new Event('blur'))
    digit()
    expect
      .soft(heard)
      .toEqual([['shiftKey'], ['shiftKey'], ['shiftKey'], null, null])
    expect.soft(recorder).toEqual(['shiftKey'])
    const codes = [
      ['ShiftRight', 'shiftKey'],
      ['AltLeft', 'altKey'],
      ['AltRight', 'altKey'],
      ['ControlLeft', 'ctrlKey'],
      ['ControlRight', 'ctrlKey'],
      ['MetaLeft', 'metaKey'],
      ['MetaRight', 'metaKey'],
      ['CapsLock', null],
    ] as const
    for (const group of [
      'GroupNext',
      'GroupPrevious',
      'GroupFirst',
      'GroupLast',
    ]) {
      for (const [code, modifier] of codes) {
        send('keydown', group, code)
        expect
          .soft(windowLayoutModifiers(window), `${group} ${code}`)
          .toEqual(modifier === null ? [] : [modifier])
        send('keyup', 'changed key', code)
        expect(windowLayoutModifiers(window)).toBeNull()
      }
    }
  } finally {
    window.dispatchEvent(new Event('blur'))
    stop()
  }
})

test('window keys remember only first-press consumption by physical key across subscriptions until keyup or blur', () => {
  const heard: [string, boolean, boolean][] = []
  const hear = (press: KeyPress) => {
    heard.push([press.code, press.repeat, press.firstPressConsumed])
    if (press.code === 'KeyK' || press.repeat) {
      press.preventDefault()
      press.stopPropagation()
    }
  }
  let stop = windowKeys(window)(hear)
  const send = (type: string, key: string, code: string, repeat = false) =>
    window.dispatchEvent(
      new KeyboardEvent(type, { key, code, repeat, cancelable: true }),
    )
  try {
    send('keydown', 'k', 'KeyK')
    send('keydown', 'a', 'KeyA')
    send('keydown', 'a', 'KeyA', true)
    send('keydown', 'a', 'KeyA', true)
    stop()
    send('keyup', 'a', 'KeyA')
    stop = windowKeys(window)(hear)
    send('keydown', 'л', 'KeyK', true)
    stop()
    send('keyup', 'л', 'KeyK')
    stop = windowKeys(window)(hear)
    send('keydown', 'k', 'KeyK', true)
    send('keydown', 'k', 'KeyK')
    stop()
    window.dispatchEvent(new Event('blur'))
    stop = windowKeys(window)(hear)
    send('keydown', 'k', 'KeyK', true)
    expect(heard).toEqual([
      ['KeyK', false, false],
      ['KeyA', false, false],
      ['KeyA', true, false],
      ['KeyA', true, false],
      ['KeyK', true, true],
      ['KeyK', true, false],
      ['KeyK', false, false],
      ['KeyK', true, false],
    ])
  } finally {
    window.dispatchEvent(new Event('blur'))
    stop()
  }
})
