import { useEffect, useRef, useState, type RefObject } from 'react'
import { focusableSelector, type Focusable } from './Overlay'

/** What an open inline form needs from its owner to place the focus. */
export interface InlineFormFocus {
  /** A press of the button of the form opened it. */
  readonly pressed: boolean
  /**
   * Gives the focus to the button of the form, or to its fallback when the
   * button is gone, as after a connect.
   */
  readonly back: () => void
}

/** The ref of an element that can take the focus. */
export type FocusRef = (element: Focusable | null) => void

/** The inline forms of one owner, as `useInlineForms` gives them. */
export interface InlineForms<Key extends string> {
  /** The key of the open form, or null while no form is open. */
  readonly open: Key | null
  /** Opens the form of `key` from a press of its button. */
  readonly show: (key: Key) => void
  /** Closes the open form. */
  readonly close: () => void
  /** The ref of the button that opens the form of `key`. */
  readonly button: (key: Key) => FocusRef
  /**
   * The ref of the element that takes the focus when the button of `key` is
   * gone, such as the name of its row.
   */
  readonly fallback: (key: Key) => FocusRef
  /** What the form of `key` gives `useInlineFormFocus`. */
  readonly focus: (key: Key) => InlineFormFocus
}

/** The open form, and whether a press of its button opened it. */
interface Opened<Key> {
  key: Key
  pressed: boolean
}

/** Whether the focus fell to the page, as when its element left the page. */
function focusLost(): boolean {
  const active = document.activeElement
  return active === null || active === document.body
}

/** The form that `initial` opens, which takes no focus. */
function openedAt<Key>(initial: Key | null): Opened<Key> | null {
  return initial === null ? null : { key: initial, pressed: false }
}

/**
 * The inline forms of one owner, one open at a time, by key. An inline form
 * takes the place of the button that opens it, as the Connect form of an
 * agent does. `show` opens a form from a press of its button, so the form
 * takes the focus, as `useInlineFormFocus` says. `initial` opens a form
 * without the focus, at first and each time that it changes, as a link to
 * the form of an agent does. A change to null closes the open form. When a
 * form closes, the focus goes back to its button, or to its fallback when
 * the button is gone.
 */
export function useInlineForms<Key extends string>(
  initial: Key | null = null,
): InlineForms<Key> {
  const [opened, setOpened] = useState(() => openedAt(initial))
  const [from, setFrom] = useState(initial)
  if (from !== initial) {
    setFrom(initial)
    setOpened(openedAt(initial))
  }
  const [buttons] = useState(() => new Map<Key, Focusable>())
  const [fallbacks] = useState(() => new Map<Key, Focusable>())
  // A render that replaces an element calls the old ref with null first.
  const keep =
    (elements: Map<Key, Focusable>, key: Key): FocusRef =>
    (element) => {
      if (element) elements.set(key, element)
      else elements.delete(key)
    }
  const back = (key: Key) => {
    for (const target of [buttons.get(key), fallbacks.get(key)]) {
      target?.focus()
      if (!focusLost()) return
    }
  }
  return {
    open: opened?.key ?? null,
    show: (key) => setOpened({ key, pressed: true }),
    close: () => setOpened(null),
    button: (key) => keep(buttons, key),
    fallback: (key) => keep(fallbacks, key),
    focus: (key) => ({
      pressed: opened?.key === key && opened.pressed,
      back: () => back(key),
    }),
  }
}

/**
 * Places the focus for an inline form while it shows, as the one owner of
 * its first focus. `form` holds the form, and `focus` comes from its owner.
 * When a press opened the form, the form takes the focus: `initial` while it
 * shows, such as the first line of the ChatGPT sign-in, else its first part
 * that can take the focus. A form that opens with its page takes none. When
 * the form leaves the page, for any reason, and the focus was in it or fell
 * to the page, `focus.back` places the focus.
 */
export function useInlineFormFocus(
  form: RefObject<HTMLElement | null>,
  focus: InlineFormFocus,
  initial?: RefObject<Focusable | null>,
): void {
  const latest = useRef(focus)
  useEffect(() => {
    latest.current = focus
  })
  useEffect(() => {
    const node = form.current
    const inForm = () => {
      const active = document.activeElement
      return active instanceof Node && node?.contains(active) === true
    }
    if (latest.current.pressed && node) {
      const first =
        initial?.current ?? node.querySelector<HTMLElement>(focusableSelector)
      first?.focus()
    }
    return () => {
      if (focusLost() || inForm()) latest.current.back()
    }
  }, [form, initial])
}
