import { describe, expect, test } from 'vitest'
import { PanelWidths } from './panels'
import type { KeyValueStorage } from './services'
import { MemoryStorage } from './test-kit'

/** A browser that refuses its storage, as some private windows do. */
const refusing: KeyValueStorage = {
  getItem: () => {
    throw new Error('The storage is not available.')
  },
  setItem: () => {
    throw new Error('The storage is not available.')
  },
}

describe('PanelWidths', () => {
  test('a width stays in its range, and the next page load gets it back', () => {
    const storage = new MemoryStorage()
    const widths = new PanelWidths(storage)
    widths.step('sidebar', 232, { by: 999 - 232 })
    widths.step('right', 440, { by: 100 - 440 })
    const reloaded = new PanelWidths(storage)
    expect(reloaded.widths.get()).toEqual({ sidebar: 360, right: 320 })
  })

  test('a drag saves only its last width', () => {
    const storage = new MemoryStorage()
    const widths = new PanelWidths(storage)
    widths.drag('right', 440).move(500 - 440)
    expect(storage.values.size).toBe(0)
    expect(widths.width('right')).toBe(500)
  })

  test('a refused storage keeps the width while the page stays open', () => {
    const widths = new PanelWidths(refusing)
    expect(widths.width('sidebar')).toBe(232)
    expect(() => widths.step('sidebar', 232, { by: 300 - 232 })).not.toThrow()
    expect(widths.width('sidebar')).toBe(300)
  })

  test('a step of a column that shows narrower than its range never widens it, and stores nothing', () => {
    const storage = new MemoryStorage()
    const widths = new PanelWidths(storage)
    // The layout shows the right column at 280 px, under its range of 320 to 640 px.
    widths.step('right', 280, { by: -8 })
    widths.step('right', 280, { to: 'min' })
    expect({
      width: widths.widths.get().right,
      stored: [...storage.values],
    }).toEqual({ width: null, stored: [] })
    // A grow starts from the width that shows, and the next page load gets it back.
    widths.step('right', 280, { by: 8 })
    expect({
      width: widths.widths.get().right,
      reloaded: new PanelWidths(storage).widths.get().right,
    }).toEqual({ width: 288, reloaded: 288 })
  })

  test('a drag shows each width at once, and a drag that ends where it started keeps the width from before', () => {
    const storage = new MemoryStorage()
    const widths = new PanelWidths(storage)
    const drag = widths.drag('right', 280)
    drag.move(60)
    expect({
      width: widths.widths.get().right,
      stored: storage.values.size,
    }).toEqual({ width: 340, stored: 0 })
    drag.move(0)
    drag.end()
    expect({
      width: widths.widths.get().right,
      stored: storage.values.size,
    }).toEqual({ width: null, stored: 0 })
    const next = widths.drag('right', 280)
    next.move(70)
    next.end()
    expect({
      width: widths.widths.get().right,
      reloaded: new PanelWidths(storage).widths.get().right,
    }).toEqual({ width: 350, reloaded: 350 })
  })

  test('a stored value that is not a width falls back to the default', () => {
    const storage = new MemoryStorage()
    storage.setItem('conducting.right-width', 'wide')
    expect(new PanelWidths(storage).width('right')).toBe(440)
  })
})
