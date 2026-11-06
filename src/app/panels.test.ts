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
    widths.set('sidebar', 999)
    widths.set('right', 100)
    const reloaded = new PanelWidths(storage)
    expect(reloaded.widths.get()).toEqual({ sidebar: 360, right: 320 })
  })

  test('a drag saves only its last width', () => {
    const storage = new MemoryStorage()
    const widths = new PanelWidths(storage)
    widths.set('right', 500, { save: false })
    expect(storage.values.size).toBe(0)
    expect(widths.width('right')).toBe(500)
  })

  test('a refused storage keeps the width while the page stays open', () => {
    const widths = new PanelWidths(refusing)
    expect(widths.width('sidebar')).toBe(232)
    expect(() => widths.set('sidebar', 300)).not.toThrow()
    expect(widths.width('sidebar')).toBe(300)
  })

  test('a stored value that is not a width falls back to the default', () => {
    const storage = new MemoryStorage()
    storage.setItem('conducting.right-width', 'wide')
    expect(new PanelWidths(storage).width('right')).toBe(440)
  })
})
