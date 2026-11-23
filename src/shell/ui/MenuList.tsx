import {
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react'
import { ChevronLeft } from 'lucide-react'
import { classes } from '../../ui/components/common/classes'
import type { MenuPlacement } from '../../ui/components/common/Menu'
import menu from '../../ui/components/common/Menu.module.css'
import type { MenuEntry } from './Menu'
import { ActionItem, SubmenuItem, SwitchItem } from './menu-items'
import { useLayerFocus } from './Overlay'
import ui from './ui.module.css'

/** The items of a menu that take the focus: the items that are on. */
const ITEM = '[role^="menuitem"]:not(:disabled)'

/**
 * Where a list draws: beside its trigger, at a point, or in a sheet.
 * `anchored` is a list in a `PopoverSurface`, which places it beside its
 * trigger.
 */
export type ListPlacement = MenuPlacement | 'point' | 'anchored'

/** The choices of the items with a submenu, and how they opened. */
export interface SubmenuControl {
  /** The submenu whose choices show, if any. */
  open: string | null
  /**
   * Shows the choices of a submenu, or closes them with null. With `focus`,
   * as after a key or a press, the focus goes into the choices. A hover
   * leaves the focus in the menu.
   */
  show: (id: string | null, focus: boolean) => void
}

function moveFocus(
  event: KeyboardEvent<HTMLDivElement>,
  close: () => void,
  point: boolean,
) {
  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(ITEM),
  )
  const at = items.findIndex((item) => item === document.activeElement)
  const last = items.length - 1
  const targets: Record<string, number> = {
    ArrowDown: at >= last ? 0 : at + 1,
    ArrowUp: at <= 0 ? last : at - 1,
    Home: 0,
    End: last,
  }
  if (event.key === 'Tab') {
    // A menu at a point has no place in the order of Tab: the focus goes
    // back to what opened it.
    if (point) event.preventDefault()
    close()
  }
  const target = targets[event.key]
  if (target === undefined) return
  event.preventDefault()
  items[target]?.focus()
}

/** The item of the list under the pointer, if any. */
function itemAt(event: PointerEvent<HTMLDivElement>): HTMLElement | null {
  const { target } = event
  if (!(target instanceof Element)) return null
  const item = target.closest<HTMLElement>(ITEM)
  return item && event.currentTarget.contains(item) ? item : null
}

/**
 * An open menu. The arrow keys move between its items. Right arrow and a
 * press on an item with a submenu show its choices. At a point, the item
 * under the pointer takes the focus, so one row shows the highlight, and a
 * hover shows the choices of an item, or closes the choices of another.
 * With `hover`, a list beside its trigger does the same for a mouse or a
 * pen, and the focus moves only out of choices that close. With `back`, the
 * list shows the choices of an item in place of its menu: Back at its top
 * and the left arrow call `back`, which shows the menu again. With `focus`,
 * the list moves the focus into itself as it opens and back as it closes. A
 * list in a sheet leaves the focus to the sheet, which is modal, and a menu
 * at a point moves the focus itself.
 *
 * While `busy`, each item and each switch is off: it fades, a screen reader
 * hears it as off, and a press does nothing. An item with a submenu shows
 * no choices. Each can still take the focus, so the focus stays in the
 * list, and the arrow keys still move it. Back still works.
 */
export function MenuList(props: {
  label: string
  entries: readonly MenuEntry[]
  placement: ListPlacement
  close: () => void
  wide?: boolean
  submenus?: SubmenuControl
  hover?: boolean
  back?: () => void
  /** Takes the element of the list, for an owner that shows its choices. */
  listRef?: RefObject<HTMLDivElement | null>
  focus?: boolean
  busy?: boolean
}) {
  const own = useRef<HTMLDivElement>(null)
  const list = props.listRef ?? own
  const { placement, submenus, back } = props
  const busy = props.busy ?? false
  const point = placement === 'point'
  useLayerFocus(list, {
    modal: false,
    enabled: props.focus ?? placement !== 'sheet',
  })
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const active = document.activeElement
    const id = active instanceof HTMLElement ? active.dataset.submenu : null
    if (event.key === 'ArrowRight' && id && submenus) {
      event.preventDefault()
      if (!busy) submenus.show(id, true)
      return
    }
    if (event.key === 'ArrowLeft' && back) {
      event.preventDefault()
      back()
      return
    }
    moveFocus(event, props.close, point)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const item = itemAt(event)
    if (!item) return
    if (point) {
      if (item !== document.activeElement) item.focus({ preventScroll: true })
      const id = item.dataset.submenu ?? null
      if (submenus && submenus.open !== id) submenus.show(id, false)
      return
    }
    // Only a mouse or a pen hovers. A touch that moves over the rows, as in
    // a scroll of the menu, shows no choices.
    if (!props.hover || !submenus || event.pointerType === 'touch') return
    const id = busy ? null : (item.dataset.submenu ?? null)
    if (submenus.open === id) return
    if (!event.currentTarget.contains(document.activeElement)) {
      item.focus({ preventScroll: true })
    }
    submenus.show(id, false)
  }
  return (
    <div
      aria-label={props.label}
      className={classes(
        menu.menu,
        placement === 'anchored' ? ui.anchoredMenu : menu[placement],
        props.wide && menu.wide,
      )}
      onKeyDown={onKeyDown}
      onPointerMove={onPointerMove}
      ref={list}
      role="menu"
    >
      {back ? (
        <>
          <ActionItem
            busy={false}
            entry={{
              kind: 'item',
              label: 'Back',
              icon: ChevronLeft,
              onSelect: back,
            }}
            select={back}
          />
          <hr className={menu.divider} />
        </>
      ) : null}
      {props.entries.map((entry, index) => {
        switch (entry.kind) {
          case 'item':
            return (
              <ActionItem
                busy={busy}
                entry={entry}
                key={entry.id ?? entry.label}
                select={() => {
                  props.close()
                  entry.onSelect()
                }}
              />
            )
          case 'submenu':
            return (
              <SubmenuItem
                busy={busy}
                entry={entry}
                key={entry.id}
                submenus={submenus}
              />
            )
          case 'switch':
            return <SwitchItem busy={busy} entry={entry} key={entry.label} />
          case 'label':
            return (
              <div className={menu.group} key={entry.label} role="none">
                {entry.label}
              </div>
            )
          case 'note':
            return (
              <p className={menu.note} key={`note-${index}`} role="none">
                {entry.text}
              </p>
            )
          case 'divider':
            return <hr className={menu.divider} key={`divider-${index}`} />
        }
      })}
    </div>
  )
}
