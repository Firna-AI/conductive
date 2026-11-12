// @vitest-environment happy-dom

import { expect, test } from 'vitest'
import { windowKeys } from '../../app/services'
import { buildShortcutKeymap } from '../../app/shortcuts/keymap'
import { readShortcutKeyText } from '../../shared/shortcut-key'
import { OpenLayers } from '../ui/layers'
import { handleShortcutPress, type ShortcutPage } from './shortcut-listener'
import { ShortcutOffers } from './shortcut-offers'
import { keysHeardBy, pressShortcut } from './shortcut-test-kit'

test('a layout switch restores Open workspace 1 in both orders and stops unmatched keys before the field or browser', () => {
  const field = document.createElement('textarea')
  document.body.append(field)
  const heard = keysHeardBy(field)
  const offers = new ShortcutOffers()
  let runs = 0
  offers.offer({ command: 'workspace-1', run: () => (runs += 1) })
  const stop = windowKeys(window)((press) =>
    handleShortcutPress(press, {
      keyboard: 'other',
      host: { kind: 'browser-tab', browser: 'chrome', system: 'linux' },
      keymap: buildShortcutKeymap('other', []),
      offers,
      terminals: new Set(),
      recorders: new Set(),
      layers: new OpenLayers(),
    }),
  )
  try {
    for (const [text, code] of [
      ['Alt+1', 'ShiftLeft'],
      ['Shift+1', 'AltLeft'],
    ]) {
      const group = pressShortcut(text, field, { key: 'GroupNext', code })
      expect(group.defaultPrevented).toBe(false)
      expect(heard).toEqual(['GroupNext'])
      heard.length = 0
      const first = pressShortcut(text, field, { key: '№' })
      const held = pressShortcut(text, field, { key: '№', repeat: true })
      const unmatched = pressShortcut('Alt+ArrowLeft', field)
      const textKey = pressShortcut('Ctrl+Z', field)
      expect
        .soft(
          [first, held, unmatched, textKey].map(
            (event) => event.defaultPrevented,
          ),
        )
        .toEqual([true, true, true, true])
      expect.soft(heard).toEqual([])
      pressShortcut(text, field, { key: 'Shift', code, type: 'keyup' })
      expect(pressShortcut('Ctrl+Z', field).defaultPrevented).toBe(false)
      heard.length = 0
    }
    for (const code of ['ShiftLeft', 'CapsLock']) {
      pressShortcut('Alt+1', field, { key: 'GroupNext', code })
      heard.length = 0
      const plain = pressShortcut('A', field, { code: 'KeyQ' })
      const shifted = pressShortcut('Shift+A', field, { code: 'KeyQ' })
      expect
        .soft([plain.defaultPrevented, shifted.defaultPrevented])
        .toEqual([false, false])
      expect.soft(heard).toEqual(['a', 'A'])
      pressShortcut('Alt+1', field, { code, type: 'keyup' })
      heard.length = 0
    }
    expect.soft(runs).toBe(2)
    expect(pressShortcut('Ctrl+Z', field).defaultPrevented).toBe(false)
    expect(heard).toEqual(['z'])
  } finally {
    window.dispatchEvent(new Event('blur'))
    stop()
    field.remove()
  }
})

test('a restored unmatched press still reaches protected input and a menu that refuses to close', () => {
  const field = document.createElement('textarea')
  document.body.append(field)
  const layers = new OpenLayers()
  const offers = new ShortcutOffers()
  offers.offer({ command: 'go-to-checks', run: () => undefined })
  const page: ShortcutPage = {
    keyboard: 'other',
    host: { kind: 'browser-tab', browser: 'chrome', system: 'linux' },
    keymap: buildShortcutKeymap('other', [
      { command: 'go-to-checks', keys: [readShortcutKeyText('A')] },
    ]),
    offers,
    terminals: new Set(),
    recorders: new Set(),
    layers,
  }
  const recorders = new Set<HTMLElement>()
  const terminals = new Set<HTMLElement>()
  const stop = windowKeys(window)((press) =>
    handleShortcutPress(press, { ...page, recorders, terminals }),
  )
  try {
    pressShortcut('Alt+1', window, { key: 'GroupNext', code: 'ShiftLeft' })
    expect.soft(pressShortcut('Ctrl+Z', field).defaultPrevented).toBe(true)
    terminals.add(field)
    expect(pressShortcut('Ctrl+Z', field).defaultPrevented).toBe(false)
    terminals.clear()
    recorders.add(field)
    expect(pressShortcut('Ctrl+Z', field).defaultPrevented).toBe(false)
    recorders.clear()
    const removeMenu = layers.addMenu(() => false)
    expect(pressShortcut('Ctrl+Z', field).defaultPrevented).toBe(false)
    expect
      .soft(
        pressShortcut('A', document.body, { repeat: true }).defaultPrevented,
      )
      .toBe(true)
    removeMenu()
    expect(
      pressShortcut('Ctrl+Z', field, { isComposing: true }).defaultPrevented,
    ).toBe(false)
  } finally {
    window.dispatchEvent(new Event('blur'))
    stop()
    field.remove()
  }
})
