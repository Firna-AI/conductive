import { describe, expect, test } from 'vitest'
import { PopoverSize } from './explain-size'
import { PanelLayout } from './panels'
import type { KeyValueStorage } from './services'
import { MemoryStorage } from './test-kit'

/** The chosen size that the next page load reads from the browser. */
function reloaded(storage: KeyValueStorage) {
  const { explain } = new PanelLayout(storage)
  return {
    width: explain.width.chosen.get(),
    height: explain.height.chosen.get(),
  }
}

/** A browser that refuses its storage, as some private windows do. */
const refusing: KeyValueStorage = {
  getItem: () => {
    throw new Error('The storage is not available.')
  },
  setItem: () => {
    throw new Error('The storage is not available.')
  },
}

describe('the size of the Explain popover', () => {
  test('a step stays in the range of its handle, and the next popover and the next page load get the size', () => {
    const storage = new MemoryStorage()
    const { explain } = new PanelLayout(storage)
    const popover = new PopoverSize(explain)
    popover.step('width', 400, { by: 999 }, 2000)
    popover.step('height', 420, { to: 'min' }, 2000)
    const next = new PopoverSize(explain)
    expect({
      moved: popover.moved.get(),
      next: { width: next.size('width'), height: next.size('height') },
      reloaded: reloaded(storage),
    }).toEqual({
      moved: { width: 720, height: 200 },
      next: { width: 720, height: 200 },
      reloaded: { width: 720, height: 200 },
    })
  })

  test('a move of the height starts from the height that shows, and stops at the room by the mark', () => {
    const storage = new MemoryStorage()
    const { explain } = new PanelLayout(storage)
    explain.height.choose(600)
    // The room below the mark is 416 px, so the panel shows 416 px of 600.
    const popover = new PopoverSize(explain)
    popover.step('height', 416, { by: 8 }, 416)
    popover.step('height', 416, { to: 'max' }, 416)
    const atRoom = {
      moved: popover.moved.get().height,
      kept: reloaded(storage).height,
    }
    popover.step('height', 416, { by: -8 }, 416)
    const shrunk = popover.moved.get().height
    const drag = popover.drag('height', 408, 416)
    drag.move(100)
    drag.end()
    expect({
      atRoom,
      shrunk,
      dragged: popover.moved.get().height,
      kept: reloaded(storage).height,
    }).toEqual({
      atRoom: { moved: null, kept: 600 },
      shrunk: 408,
      dragged: 416,
      kept: 416,
    })
  })

  test('a drag shows each size at once and stores only its last, and a drag that ends where it started shows the panel as before', () => {
    const storage = new MemoryStorage()
    const popover = new PopoverSize(new PanelLayout(storage).explain)
    // A short answer shows the panel 180 px high.
    const back = popover.drag('height', 180, 770)
    back.move(40)
    const moving = {
      height: popover.moved.get().height,
      stored: storage.values.size,
    }
    back.move(0)
    back.end()
    const ended = {
      height: popover.moved.get().height,
      stored: storage.values.size,
    }
    const narrower = popover.drag('width', 400, 1000)
    narrower.move(-120)
    narrower.end()
    expect({
      moving,
      ended,
      width: popover.moved.get().width,
      reloaded: reloaded(storage),
    }).toEqual({
      moving: { height: 220, stored: 0 },
      ended: { height: null, stored: 0 },
      width: 320,
      reloaded: { width: 320, height: null },
    })
  })

  test('Home or a grow from a panel lower than its range goes to the smallest size, and the chosen size stays in the range', () => {
    const storage = new MemoryStorage()
    const { explain } = new PanelLayout(storage)
    // A short answer shows the panel 150 px high, with 500 px of room by
    // the mark, so Home has room for the smallest size, 200 px.
    const home = new PopoverSize(explain)
    home.step('height', 150, { to: 'min' }, 500)
    const homed = {
      moved: home.moved.get().height,
      kept: reloaded(storage).height,
    }
    const short = new PopoverSize(explain)
    short.step('height', 150, { by: 8 }, 2000)
    const cramped = new PopoverSize(explain)
    cramped.step('height', 120, { by: 8 }, 180)
    expect({
      homed,
      short: short.moved.get().height,
      cramped: cramped.moved.get().height,
      reloaded: reloaded(storage).height,
    }).toEqual({
      homed: { moved: 200, kept: 200 },
      short: 200,
      cramped: 180,
      reloaded: 200,
    })
  })

  test('a refused storage keeps the size while the page stays open', () => {
    const { explain } = new PanelLayout(refusing)
    const popover = new PopoverSize(explain)
    expect(() => popover.step('width', 400, { by: 32 }, 1000)).not.toThrow()
    expect(new PopoverSize(explain).size('width')).toBe(432)
  })
})
