import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { placeChoices } from './menu-place'
import { useEscapeLayer } from './Overlay'
import ui from './ui.module.css'

/** The open submenu of a menu, and how it opened. */
interface OpenSubmenu {
  /** The key of its item. */
  key: string
  /** The focus goes into it: after a key or a press, not after a hover. */
  focus: boolean
}

/** The submenu of a menu, as `useSubmenu` gives it. */
export interface Submenu {
  /** The key of the item whose submenu shows, if any. */
  open: string | null
  /**
   * Shows the submenu of an item. With `focus`, as after a key or a press,
   * the focus goes into it. A hover leaves the focus in the menu.
   */
  show: (key: string, focus: boolean) => void
  /**
   * Hides the submenu. With `back`, its item takes the focus when the menu
   * shows it again.
   */
  hide: (back: boolean) => void
  /** The focus is in the rows of the submenu. */
  hasFocus: () => boolean
}

/**
 * The item of a menu that takes the focus: the checked one that is on, else
 * the first one that is on.
 */
export function choiceToFocus(layer: HTMLElement): HTMLElement | null {
  return (
    layer.querySelector<HTMLElement>(
      '[role^="menuitem"][aria-checked="true"]:not(:disabled)',
    ) ?? layer.querySelector<HTMLElement>('[role^="menuitem"]:not(:disabled)')
  )
}

/**
 * The open submenu of a menu whose items with a submenu have `keys`, such
 * as All models of the model menu. `list` holds the rows of the menu, and
 * `rows` the rows of the submenu: a layer beside the menu, or the menu
 * itself when the submenu takes its place. A submenu that opens after a key
 * or a press takes the focus once: its checked row, else its first. Escape
 * hides the submenu before the menu, and its item takes the focus back when
 * the focus was in it. An item that leaves the menu takes its submenu with
 * it.
 */
export function useSubmenu(
  keys: readonly string[],
  list: RefObject<HTMLElement | null>,
  rows: RefObject<HTMLElement | null>,
): Submenu {
  const [state, setState] = useState<OpenSubmenu | null>(null)
  const focused = useRef<OpenSubmenu | null>(null)
  const back = useRef<string | null>(null)
  const open = state !== null && keys.includes(state.key) ? state : null
  if (state !== null && open === null) setState(null)
  const hasFocus = () => rows.current?.contains(document.activeElement) ?? false
  const hide = (refocus: boolean) => {
    if (open === null) return
    back.current = refocus ? open.key : null
    setState(null)
  }
  useEscapeLayer(open !== null, () => hide(hasFocus()))
  useLayoutEffect(() => {
    const node = rows.current
    if (!open?.focus || focused.current === open || !node) return
    focused.current = open
    if (!node.contains(document.activeElement)) choiceToFocus(node)?.focus()
  })
  useLayoutEffect(() => {
    const key = back.current
    if (key === null || state !== null) return
    back.current = null
    const items = list.current?.querySelectorAll<HTMLElement>('[data-submenu]')
    ;[...(items ?? [])].find((item) => item.dataset.submenu === key)?.focus()
  })
  return {
    open: open?.key ?? null,
    show: (key, focus) => setState({ key, focus }),
    hide,
    hasFocus,
  }
}

/** The room above the first row of a menu: its top border and padding. */
function leadOf(menu: Element | null): number {
  if (!menu) return 0
  const style = getComputedStyle(menu)
  const room =
    Number.parseFloat(style.borderTopWidth) +
    Number.parseFloat(style.paddingTop)
  return Number.isNaN(room) ? 0 : room
}

/**
 * Places the submenu of `layer` beside `menu`, so that its first row lines
 * up with the item that shows it, as `placeChoices` places the choices of a
 * menu at a point.
 */
function placeBeside(menu: HTMLElement, layer: HTMLElement): void {
  const item = menu.querySelector<HTMLElement>('[aria-expanded="true"]')
  if (!item) return
  const room = {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  }
  const size = { width: layer.offsetWidth, height: layer.offsetHeight }
  const lead = leadOf(layer.firstElementChild)
  const at = placeChoices(
    menu.getBoundingClientRect(),
    item.getBoundingClientRect(),
    lead,
    size,
    room,
  )
  layer.style.left = `${at.left}px`
  layer.style.top = `${at.top}px`
}

/**
 * The open submenu of a menu on a computer, in a layer with a fixed
 * position beside the menu, level with its item. It opens on the right of
 * the menu when it fits there, else on its left, and it moves up to stay in
 * the window. It follows the menu when the page or the menu scrolls, and
 * when the window resizes. Inside a menu in the top layer, it shows there
 * too. `onKeyDown` takes the keys of its rows, such as the left arrow,
 * which hides it.
 */
export function SubmenuLayer(props: {
  menu: RefObject<HTMLElement | null>
  layer: RefObject<HTMLDivElement | null>
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
  children: ReactNode
}) {
  const { menu, layer } = props
  useLayoutEffect(() => {
    if (menu.current && layer.current) placeBeside(menu.current, layer.current)
  })
  useEffect(() => {
    const follow = () => {
      if (menu.current && layer.current) {
        placeBeside(menu.current, layer.current)
      }
    }
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => {
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  }, [menu, layer])
  return (
    <div className={ui.pointLayer} onKeyDown={props.onKeyDown} ref={layer}>
      {props.children}
    </div>
  )
}
