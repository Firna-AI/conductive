import {
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import type { LucideIcon } from 'lucide-react'
import { ChevronLeft } from 'lucide-react'
import { classes } from '../../ui/components/common/classes'
import styles from '../../ui/components/common/Menu.module.css'
import { useTouch } from '../../ui/components/common/touch'
import type { ShortcutHint } from '../../shell/shortcuts/shortcut-hints'
import { PopoverSurface } from '../../shell/ui/PopoverSurface'
import { SubmenuLayer, useSubmenu } from '../../shell/ui/submenu'
import ui from '../../shell/ui/ui.module.css'
import { useFocusInside } from './dismiss'
import local from './menu.module.css'
import { firstItem, itemAt, MenuRows, moveFocus } from './menu-rows'

export type MenuItem = {
  kind: 'item'
  key: string
  label: string
  onSelect: () => void
  icon?: LucideIcon
  /** A mark in place of the icon, such as an agent mark. */
  mark?: ReactNode
  /** Muted text after the label, such as the time of a session. */
  detail?: string
  /**
   * Muted words that follow the label in its line, such as the effort of a
   * favourite after its model.
   */
  muted?: string
  /** An icon at the end of the row, such as the arrow that reopens. */
  trailingIcon?: LucideIcon
  /**
   * The spoken name of the trailing icon, when the icon says what the label
   * does not, such as "New session". Without it, a screen reader skips the
   * icon.
   */
  trailingLabel?: string
  /** A choice in a group: the menu marks the current one. */
  checked?: boolean
  /** An item that is off: it keeps its place, greyed, and the arrows skip it. */
  disabled?: boolean
}

/**
 * A setting that is on or off, with a switch at the end of its row, such as
 * Fast in the model menu. A change keeps the menu open, so the switch shows
 * its new state in place.
 */
export type MenuSwitch = {
  kind: 'switch'
  key: string
  label: string
  on: boolean
  onToggle: () => void
  /** The key of the command that changes the setting, before the switch. */
  shortcut?: ShortcutHint
}

/** A row of a menu: each entry but an item that shows a submenu. */
export type MenuRow =
  | MenuItem
  | MenuSwitch
  | { kind: 'label'; label: string }
  | { kind: 'note'; text: string }
  | { kind: 'divider' }

/**
 * An item that shows a submenu of `entries`, such as All models, with an
 * arrow at its end. On a computer, the submenu opens beside the menu, level
 * with the item. In the phone layout and in a sheet, it takes the place of
 * the menu, with Back at its top, because no room is beside the menu.
 */
export type MenuSubmenu = {
  kind: 'submenu'
  key: string
  label: string
  /**
   * Muted words that follow the label in its line, such as the current
   * effort after Effort.
   */
  muted?: string
  entries: readonly MenuRow[]
}

export type MenuEntry = MenuRow | MenuSubmenu

/** A point of the window, in CSS px, where a menu opens. */
export interface MenuPoint {
  x: number
  y: number
}

/** Where a menu beside its trigger opens: below or above, from which edge. */
type AnchoredPlacement =
  'below-start' | 'below-end' | 'above-start' | 'above-end'

/**
 * Where a menu opens: beside its trigger, with its top left corner at a
 * point of the window, or in a phone sheet. A menu beside its trigger names
 * its anchor, the trigger or the wrapper that holds it.
 */
type MenuPlace =
  | { placement: AnchoredPlacement; anchor: RefObject<HTMLElement | null> }
  | { placement: 'sheet' | MenuPoint; anchor?: undefined }

/**
 * A menu beside its trigger keeps its own width and its own height limit,
 * as the shell menus do. The surface limits it only to the room beside its
 * trigger. The gaps are those of the mockups: 6 px above, 4 px below.
 */
const ABOVE = {
  anchorWidthAsMinimum: false,
  maxHeight: Number.POSITIVE_INFINITY,
  gutter: 6,
}
const BELOW = { ...ABOVE, gutter: 4 }

/** A menu at a point keeps this gap to the right and bottom of the window. */
const edge = 4

/** The class of the place of a menu: its layer, a point, or a sheet. */
function placeClass(place: MenuPlace): string | undefined {
  if (place.anchor) return ui.anchoredMenu
  return typeof place.placement === 'string' ? styles.sheet : local.point
}

/**
 * An open menu of actions or choices, in the dense rows of the mockups.
 * Beside its trigger, it opens on the surface of the shell menus, in the top
 * layer, so no box around the trigger cuts it. It opens on the side of its
 * placement when it fits there, else on the side with more room, and gets
 * shorter to fit. At a point, it draws above the page from its own fixed
 * position. The arrow keys move between the items that are on, and skip the
 * items that are off, as the menus of the design system do. Escape closes
 * it. Tab closes a popover, and a menu at a point gives the focus back to
 * where it was. Tab stays inside a sheet. A wide menu fits long rows, such
 * as session titles.
 *
 * An item with a submenu shows it after a press, Enter, Space, or the right
 * arrow, and the focus goes into it. On a computer, a hover over the item
 * shows it too, and a hover over another item of the menu hides it. The
 * left arrow and Escape hide it, and its item takes the focus back. In the
 * phone layout and in a sheet, its rows take the place of the rows of the
 * menu, and Back shows them again.
 */
export function Menu(
  props: {
    label: string
    entries: readonly MenuEntry[]
    onClose: () => void
    wide?: boolean
  } & MenuPlace,
) {
  const ref = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const phone = useTouch()
  const { placement } = props
  const point = typeof placement === 'string' ? null : placement
  const inPlace = phone || placement === 'sheet'
  const submenu = useSubmenu(
    props.entries.flatMap((entry) =>
      entry.kind === 'submenu' ? [entry.key] : [],
    ),
    ref,
    inPlace ? ref : layer,
  )
  const open =
    props.entries.find(
      (entry): entry is MenuSubmenu =>
        entry.kind === 'submenu' && entry.key === submenu.open,
    ) ?? null
  const x = point?.x
  const y = point?.y
  useFocusInside(ref, firstItem)
  // At a point, the top left corner of the menu goes there. A menu that would
  // pass the right side of the window moves left, and one that would pass
  // its bottom opens upwards from the point.
  useLayoutEffect(() => {
    const node = ref.current
    if (!node || x === undefined || y === undefined) return
    const right = window.innerWidth - node.offsetWidth - edge
    const fits = y + node.offsetHeight <= window.innerHeight - edge
    node.style.left = `${Math.max(0, Math.min(x, right))}px`
    node.style.top = `${fits ? y : Math.max(0, y - node.offsetHeight)}px`
  }, [x, y])
  /** The keys of each list of the menu: the arrows, Home, End, and Tab. */
  const onRowKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (moveFocus(event)) return
    if (event.key === 'Tab' && placement !== 'sheet') {
      // A menu at a point has no place in the order of Tab.
      if (point) event.preventDefault()
      props.onClose()
    }
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const active = document.activeElement
    const key = active instanceof HTMLElement ? active.dataset.submenu : null
    if (event.key === 'ArrowRight' && key) {
      event.preventDefault()
      submenu.show(key, true)
    } else if (event.key === 'ArrowLeft' && open && inPlace) {
      event.preventDefault()
      submenu.hide(true)
    } else onRowKey(event)
  }
  const onSubmenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      submenu.hide(true)
    } else onRowKey(event)
  }
  // Only a mouse or a pen hovers. A touch that moves over the rows, as in a
  // scroll of the menu, shows no submenu.
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const item = inPlace || event.pointerType === 'touch' ? null : itemAt(event)
    if (!item) return
    const key = item.dataset.submenu
    if (key) {
      if (submenu.open !== key) submenu.show(key, false)
    } else if (open) {
      if (submenu.hasFocus()) item.focus({ preventScroll: true })
      submenu.hide(false)
    }
  }
  const rows: readonly MenuEntry[] =
    open && inPlace
      ? [
          {
            kind: 'item',
            key: 'back',
            label: 'Back',
            icon: ChevronLeft,
            onSelect: () => submenu.hide(true),
          },
          { kind: 'divider' },
          ...open.entries,
        ]
      : props.entries
  const list = (
    <div
      aria-label={open && inPlace ? open.label : props.label}
      className={classes(
        styles.menu,
        placeClass(props),
        props.wide && styles.wide,
      )}
      onKeyDown={onKeyDown}
      onPointerMove={onPointerMove}
      ref={ref}
      role="menu"
    >
      <MenuRows entries={rows} submenu={submenu} />
    </div>
  )
  const beside =
    open && !inPlace ? (
      <SubmenuLayer layer={layer} menu={ref}>
        <div
          aria-label={open.label}
          className={classes(styles.menu, styles.point)}
          onKeyDown={onSubmenuKey}
          role="menu"
        >
          <MenuRows entries={open.entries} />
        </div>
      </SubmenuLayer>
    ) : null
  if (!props.anchor) {
    return (
      <>
        {list}
        {beside}
      </>
    )
  }
  const above = props.placement.startsWith('above')
  return (
    <PopoverSurface
      align={props.placement.endsWith('end') ? 'end' : 'start'}
      anchor={props.anchor}
      className={ui.menuLayer}
      options={above ? ABOVE : BELOW}
      side={above ? 'above' : 'below'}
    >
      {list}
      {beside}
    </PopoverSurface>
  )
}
