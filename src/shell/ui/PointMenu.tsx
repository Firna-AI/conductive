import {
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { useMenuLayer } from './layers'
import type { MenuEntry } from './Menu'
import { MenuList } from './MenuList'
import { placeChoices, placeMenu, type MenuAnchor } from './menu-place'
import { useEscapeLayer } from './Overlay'
import ui from './ui.module.css'

/** The open choices of an item of a menu at a point. */
export interface PointChoices {
  /** The item of the menu that shows them. */
  id: string
  /** The focus goes into them: after a key or a press, not after a hover. */
  focus: boolean
  /** The choices in their own menu box. */
  content: ReactNode
}

/** The item that takes the focus in a list of choices: the checked one, else the first. */
function choiceToFocus(layer: HTMLElement): HTMLElement | null {
  return (
    layer.querySelector<HTMLElement>(
      '[role^="menuitem"][aria-checked="true"]:not(:disabled)',
    ) ?? layer.querySelector<HTMLElement>('[role^="menuitem"]:not(:disabled)')
  )
}

/**
 * Moves the focus into the choices of `layer` while `active`, as after a
 * key or a press that opened them: to the checked choice, else the first.
 * Choices that come after a load take it too. A focus already inside stays.
 */
export function useChoiceFocus(
  layer: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useLayoutEffect(() => {
    const node = layer.current
    if (!active || !node || node.contains(document.activeElement)) return
    choiceToFocus(node)?.focus()
  })
}

function size(node: HTMLElement) {
  return { width: node.offsetWidth, height: node.offsetHeight }
}

function windowSize() {
  return { width: window.innerWidth, height: window.innerHeight }
}

/** Places the menu at its anchor, and its open choices beside their item. */
function place(
  menu: HTMLElement,
  anchor: MenuAnchor,
  choices: HTMLElement | null,
): void {
  const room = windowSize()
  const at = placeMenu(anchor, size(menu), room)
  menu.style.left = `${at.left}px`
  menu.style.top = `${at.top}px`
  const item = menu.querySelector<HTMLElement>('[aria-expanded="true"]')
  const first = menu.querySelector<HTMLElement>('[role^="menuitem"]')
  if (!choices || !item || !first) return
  const box = menu.getBoundingClientRect()
  const lead = first.getBoundingClientRect().top - box.top
  const next = placeChoices(
    box,
    item.getBoundingClientRect(),
    lead,
    size(choices),
    room,
  )
  choices.style.left = `${next.left}px`
  choices.style.top = `${next.top}px`
}

/**
 * A menu at a point of the window, drawn above the page so that no box that
 * scrolls cuts it off. It stays inside the window, also after its choices
 * load. Escape closes the open choices first, then the menu. A press
 * outside, Tab, and the palette key close the menu, unless `close` refuses,
 * as while a change of the menu runs. `showChoices` can refuse in the same
 * way, and then the choices and the focus stay. The focus goes into the menu
 * as it opens, and back with `back` as it closes, unless the user moved it
 * elsewhere. The menu of the browser stays shut over it.
 */
export function PointMenu(props: {
  label: string
  entries: readonly MenuEntry[]
  anchor: MenuAnchor
  choices: PointChoices | null
  /**
   * Shows the choices of an item, or closes them with null, and says
   * whether they changed. A change of the menu that runs can refuse.
   */
  showChoices: (id: string | null, focus: boolean) => boolean
  /** Asks the menu to close, and says whether it closed. */
  close: () => boolean
  /** Gives the focus back to what opened the menu, such as a row. */
  back: () => void
}) {
  const frame = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const choices = useRef<HTMLDivElement>(null)
  const latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  })
  const { anchor, choices: open, showChoices } = props
  const closeChoices = () => {
    const node = choices.current
    const inside = node?.contains(document.activeElement) ?? false
    if (!showChoices(null, false)) return
    if (inside) {
      menu.current
        ?.querySelector<HTMLElement>('[aria-expanded="true"]')
        ?.focus()
    }
  }
  useEscapeLayer(true, () => latest.current.close())
  useEscapeLayer(open !== null, closeChoices)
  useMenuLayer(true, () => latest.current.close())

  // The layout of the window and of the content can change at each render,
  // such as when the choices load.
  useLayoutEffect(() => {
    if (menu.current) place(menu.current, anchor, choices.current)
  })
  useEffect(() => {
    const onResize = () => {
      if (menu.current) place(menu.current, anchor, choices.current)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [anchor])

  // The focus goes into the menu once, and back as it closes.
  useEffect(() => {
    const layer = frame.current
    const node = menu.current
    if (node) choiceToFocus(node)?.focus()
    return () => {
      const active = document.activeElement
      const lost = active === null || active === document.body
      if (lost || layer?.contains(active)) latest.current.back()
    }
  }, [])
  // Choices that open by a key or a press take the focus.
  useChoiceFocus(choices, open?.focus ?? false)

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (frame.current?.contains(target)) return
      latest.current.close()
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [])

  const onChoicesKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      closeChoices()
    } else if (event.key === 'Tab') {
      event.preventDefault()
      latest.current.close()
    }
  }
  return createPortal(
    <div onContextMenu={(event) => event.preventDefault()} ref={frame}>
      <div className={ui.pointLayer} ref={menu}>
        <MenuList
          close={() => props.close()}
          entries={props.entries}
          focus={false}
          label={props.label}
          placement="point"
          submenus={{ open: open?.id ?? null, show: showChoices }}
        />
      </div>
      {open ? (
        <div className={ui.pointLayer} onKeyDown={onChoicesKey} ref={choices}>
          {open.content}
        </div>
      ) : null}
    </div>,
    document.body,
  )
}
