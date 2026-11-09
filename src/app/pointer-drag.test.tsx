// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { byRole } from '../test-support/dom-queries'
import { mount } from '../test-support/mount'
import { ownPress, usePointerDrag, type PointerDrag } from './pointer-drag'

type Drop = Pick<
  PointerDrag<string, number>,
  'item' | 'place' | 'touch' | 'moved'
>

/**
 * Two items in a row, each 100 px wide, with a Close control that keeps its
 * own press. The drop place is the item under the pointer, after the row
 * scrolled by `scroll.left`.
 */
function Row(props: {
  drops: Drop[]
  picks: string[]
  scroll?: { left: number }
}) {
  const { drag, bind } = usePointerDrag<string, number>({
    locate: (_item, x) => Math.floor((x + (props.scroll?.left ?? 0)) / 100),
    drop: ({ item, place, touch, moved }) =>
      props.drops.push({ item, place, touch, moved }),
  })
  return (
    <>
      <ul>
        {['a', 'b'].map((item, index) => (
          <li key={item} {...bind(item, index)}>
            <button onClick={() => props.picks.push(item)} type="button">
              {item}
            </button>
            <span {...ownPress}>
              <button type="button">Close {item}</button>
            </span>
          </li>
        ))}
      </ul>
      <p role="status">{drag ? `${drag.item} at ${drag.place}` : 'still'}</p>
    </>
  )
}

/** What the row says about the drag. */
function shown(): string {
  return document.querySelector('[role="status"]')?.textContent ?? ''
}

/** Sends a pointer event with the primary button down, unless `init` says otherwise. */
function pointer(target: EventTarget, type: string, init: PointerEventInit) {
  act(() => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        button: 0,
        buttons: 1,
        ...init,
      }),
    )
  })
}

/** Sends an event that the browser could act on, and says whether it may. */
function allowed(target: EventTarget, event: Event): boolean {
  act(() => {
    target.dispatchEvent(event)
  })
  return !event.defaultPrevented
}

const mouse = { pointerType: 'mouse', clientY: 10 }
const finger = { pointerType: 'touch', pointerId: 2, clientY: 10 }

describe('the pointer drag', () => {
  it('lifts an item after a mouse moves more than 4 px, keeps a smaller move a click, and ends a press whose release never came', async () => {
    const drops: Drop[] = []
    const picks: string[] = []
    await mount(<Row drops={drops} picks={picks} />)
    const a = byRole('button', 'a')

    pointer(a, 'pointerdown', { ...mouse, clientX: 50 })
    pointer(window, 'pointermove', { ...mouse, clientX: 54 })
    const small = shown()
    pointer(window, 'pointerup', { ...mouse, clientX: 54, buttons: 0 })
    act(() => a.click())
    // The button came up out of sight, such as over a menu of the system.
    pointer(a, 'pointerdown', { ...mouse, clientX: 50 })
    pointer(window, 'pointermove', { ...mouse, clientX: 150, buttons: 0 })
    pointer(window, 'pointermove', { ...mouse, clientX: 160 })
    const lost = shown()
    pointer(a, 'pointerdown', { ...mouse, clientX: 50 })
    pointer(window, 'pointermove', { ...mouse, clientX: 55 })
    const lifted = shown()
    pointer(window, 'pointermove', { ...mouse, clientX: 150 })
    const over = shown()
    pointer(window, 'pointerup', { ...mouse, clientX: 150, buttons: 0 })

    expect({ small, picks, lost, lifted, over, drops }).toEqual({
      small: 'still',
      picks: ['a'],
      lost: 'still',
      lifted: 'a at 0',
      over: 'a at 1',
      drops: [{ item: 'a', place: 1, touch: false, moved: true }],
    })
  })

  it('lifts an item after a finger holds it 450 ms, lets a finger that moves first scroll, and keeps a lifted finger from scrolling the page or opening a menu', async () => {
    const drops: Drop[] = []
    await mount(<Row drops={drops} picks={[]} />)
    const a = byRole('button', 'a')
    const b = byRole('button', 'b')
    vi.useFakeTimers()
    try {
      pointer(a, 'pointerdown', { ...finger, clientX: 50 })
      act(() => vi.advanceTimersByTime(200))
      pointer(window, 'pointermove', { ...finger, clientX: 59 })
      act(() => vi.advanceTimersByTime(250))
      const scrolled = shown()
      pointer(window, 'pointercancel', { ...finger, clientX: 59, buttons: 0 })

      pointer(b, 'pointerdown', { ...finger, clientX: 150 })
      act(() => vi.advanceTimersByTime(449))
      const early = shown()
      act(() => vi.advanceTimersByTime(1))
      const held = shown()
      const event = { bubbles: true, cancelable: true }
      const pageScrolls = allowed(b, new Event('touchmove', event))
      const menuOpens = allowed(b, new MouseEvent('contextmenu', event))
      pointer(window, 'pointermove', { ...finger, clientX: 157 })
      pointer(window, 'pointerup', { ...finger, clientX: 157, buttons: 0 })

      expect({ scrolled, early, held, pageScrolls, menuOpens, drops }).toEqual({
        scrolled: 'still',
        early: 'still',
        held: 'b at 1',
        pageScrolls: false,
        menuOpens: false,
        drops: [{ item: 'b', place: 1, touch: true, moved: false }],
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('finds the drop place again when a scroll moves the places under a pointer that stays still', async () => {
    const drops: Drop[] = []
    const scroll = { left: 0 }
    const view = await mount(<Row drops={drops} picks={[]} scroll={scroll} />)
    const list = view.container.querySelector('ul')
    if (!list) throw new Error('The row has no list.')

    pointer(byRole('button', 'a'), 'pointerdown', { ...mouse, clientX: 50 })
    pointer(window, 'pointermove', { ...mouse, clientX: 150 })
    const before = shown()
    scroll.left = 100
    act(() => {
      list.dispatchEvent(new Event('scroll'))
    })
    const after = shown()
    pointer(window, 'pointerup', { ...mouse, clientX: 150, buttons: 0 })

    expect({ before, after, drops }).toEqual({
      before: 'a at 1',
      after: 'a at 2',
      drops: [{ item: 'a', place: 2, touch: false, moved: true }],
    })
  })

  it('lifts an item that a mouse drags, but not from a control that keeps its own press, and starts no native drag', async () => {
    await mount(<Row drops={[]} picks={[]} />)
    const a = byRole('button', 'a')

    pointer(byRole('button', 'Close a'), 'pointerdown', {
      ...mouse,
      clientX: 80,
    })
    pointer(window, 'pointermove', { ...mouse, clientX: 120 })
    const fromClose = shown()
    pointer(window, 'pointerup', { ...mouse, clientX: 120, buttons: 0 })
    pointer(a, 'pointerdown', { ...mouse, clientX: 50 })
    pointer(window, 'pointermove', { ...mouse, clientX: 120 })
    const fromItem = shown()
    pointer(window, 'pointerup', { ...mouse, clientX: 120, buttons: 0 })
    const nativeDrag = allowed(
      a,
      new Event('dragstart', { bubbles: true, cancelable: true }),
    )

    expect({ fromClose, fromItem, nativeDrag }).toEqual({
      fromClose: 'still',
      fromItem: 'a at 1',
      nativeDrag: false,
    })
  })
})
