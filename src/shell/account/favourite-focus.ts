import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type RefCallback,
} from 'react'
import { focusLost } from '../ui/lost-focus'

/** The controls of the row of a favourite that take the focus. */
const rowControls = ['picker', 'remove'] as const

/** A control of the row of a favourite: its picker or ×. */
type FavouriteControl = (typeof rowControls)[number]

/** The control that has the focus, and its row. */
interface FocusedControl {
  id: string
  control: FavouriteControl
  element: HTMLElement
}

/**
 * The focus of the Favourites section. `ids` are the rows that show, in
 * their order. After an add, the picker of the new row takes the focus once
 * it shows.
 *
 * A render can take the control that has the focus out of the list: × takes
 * its own row, the reply of a save can drop a copy, and a failed add takes
 * its new row. The focus then goes to the same control at the same place,
 * else to that control in the last row, else to Add a favourite. As
 * `useRowFocus` does for workspace rows, the section gives back only a lost
 * focus: the control left the page, and the focus fell to the page itself.
 * When the person moves the focus out of the list, the list lets it go. So
 * a mount, a read of the account on a return to the page, or a click
 * elsewhere moves nothing. `useLostFocus` does not fit, because it also
 * moves a focus that fell to the page from outside the list.
 */
export function useFavouriteFocus(ids: readonly string[]) {
  const [controls] = useState(() => ({
    picker: new Map<string, HTMLElement>(),
    remove: new Map<string, HTMLElement>(),
  }))
  const add = useRef<HTMLElement | null>(null)
  const focused = useRef<FocusedControl | null>(null)
  // The rows of the last render, which give the place of a row that left.
  const shownBefore = useRef<readonly string[]>([])
  // The row of a new favourite, whose picker takes the focus once it shows.
  const added = useRef<string | null>(null)
  useLayoutEffect(() => {
    const before = shownBefore.current
    shownBefore.current = ids
    const lost = focused.current
    if (!lost || lost.element.isConnected) return
    focused.current = null
    if (!focusLost()) return
    // The row at the same place, else the last row, else no row.
    const place = before.indexOf(lost.id)
    const row = place >= 0 && place < ids.length ? ids[place] : ids.at(-1)
    const next =
      row === undefined ? add.current : controls[lost.control].get(row)
    next?.focus()
  })
  // A passive effect runs after the list of Add a favourite closed and gave
  // the focus back, also after a phone sheet made the page active again.
  useEffect(() => {
    const id = added.current
    const picker = id === null ? undefined : controls.picker.get(id)
    if (!picker) return
    added.current = null
    picker.focus()
  })
  /** The control of a row that `target` is, or null. */
  const controlOf = (target: EventTarget): FocusedControl | null => {
    for (const control of rowControls) {
      for (const [id, element] of controls[control]) {
        if (element === target) return { id, control, element }
      }
    }
    return null
  }
  return {
    /** The ref of the control `control` of the row `id`. */
    controlRef:
      (id: string, control: FavouriteControl): RefCallback<unknown> =>
      (element) => {
        if (element instanceof HTMLElement) controls[control].set(id, element)
        else controls[control].delete(id)
      },
    /** The ref of Add a favourite. */
    addRef: (element: unknown) => {
      add.current = element instanceof HTMLElement ? element : null
    },
    /** The picker of the new row `id` takes the focus once it shows. */
    focusAdded: (id: string) => {
      added.current = id
    },
    /**
     * An element of the list takes the focus. A control of a row becomes
     * the focused control. The focus in the open menu of a picker keeps the
     * picker.
     */
    onFocus: (event: FocusEvent<HTMLElement>) => {
      const control = controlOf(event.target)
      if (control) focused.current = control
    },
    /**
     * An element of the list loses the focus. The blur comes before the next
     * element takes the focus, so the check waits for a microtask. The list
     * then lets the focus go, unless the focus is still in the list, as in
     * the open menu of a picker, or while the window is in the background.
     * React takes no event while a render changes the page, so a blur that a
     * browser fires as a render takes a control out reaches no handler.
     */
    onBlur: (event: FocusEvent<HTMLElement>) => {
      const control = focused.current
      if (!control) return
      const list = event.currentTarget
      queueMicrotask(() => {
        if (focused.current !== control) return
        if (!list.contains(document.activeElement)) focused.current = null
      })
    },
  }
}
