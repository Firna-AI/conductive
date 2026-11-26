import { describe, expect, test } from 'vitest'
import { surfacePlacement, type Setup } from './PopoverSurface'

const room = { width: 1280, height: 500 }
const menu = { width: 176, height: 120 }

/** A 26 px button whose top is at `top`, with its right edge at x 270. */
function button(top: number) {
  return { left: 244, top, bottom: top + 26, width: 26, height: 26 }
}

/** The vertical place of a menu: its side, and its top or bottom edge. */
function place(top: number, setup: Setup) {
  const at = surfacePlacement(button(top), menu, room, setup)
  return { side: at.side, top: at.top, bottom: at.bottom, left: at.left }
}

describe('the placement of a menu beside its button', () => {
  test('a menu that prefers below opens below when it fits, and flips above near the bottom of the window', () => {
    const below: Setup = { align: 'end', side: 'below' }
    expect({
      room: place(100, below),
      noRoom: place(420, below),
    }).toEqual({
      room: { side: 'bottom', top: 130, bottom: undefined, left: 94 },
      noRoom: { side: 'top', top: undefined, bottom: 84, left: 94 },
    })
  })

  test('a menu that prefers above opens above when it fits, and flips below near the top of the window', () => {
    const above: Setup = { align: 'start', side: 'above' }
    expect({
      room: place(420, above),
      noRoom: place(40, above),
    }).toEqual({
      room: { side: 'top', top: undefined, bottom: 84, left: 244 },
      noRoom: { side: 'bottom', top: 70, bottom: undefined, left: 244 },
    })
  })

  test('a surface that keeps its side opens below also when it does not fit there, limited to the room below', () => {
    const tall = { width: 320, height: 240 }
    const at = (keepSide: boolean) => {
      const placed = surfacePlacement(button(300), tall, room, {
        align: 'start',
        side: 'below',
        keepSide,
      })
      return { side: placed.side, top: placed.top, maxHeight: placed.maxHeight }
    }
    expect({ flips: at(false), keeps: at(true) }).toEqual({
      flips: { side: 'top', top: undefined, maxHeight: 288 },
      keeps: { side: 'bottom', top: 330, maxHeight: 162 },
    })
  })
})
