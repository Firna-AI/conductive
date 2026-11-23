import { useRef, type KeyboardEvent, type RefObject } from 'react'
import type { MenuPlacement } from '../../ui/components/common/Menu'
import type { MenuEntry, MenuSubmenu } from './Menu'
import { MenuList, type SubmenuControl } from './MenuList'
import { PopoverSurface } from './PopoverSurface'
import { SubmenuLayer, useSubmenu } from './submenu'
import ui from './ui.module.css'

/**
 * The menu keeps its own width and its own height limit, `max-height: 70dvh`
 * in its CSS. The surface then limits it only to the room beside its
 * trigger, and does not widen it to the width of the trigger.
 */
const SURFACE_OPTIONS = {
  anchorWidthAsMinimum: false,
  maxHeight: Number.POSITIVE_INFINITY,
}

/**
 * Where an open menu draws: beside its trigger, in the wrapper `anchor`, on
 * the side of `placement`, or in a phone sheet that its owner draws.
 */
type OpenPlace =
  | {
      anchor: RefObject<HTMLElement | null>
      placement: Exclude<MenuPlacement, 'sheet'>
    }
  | 'sheet'

/**
 * The open menu of a `MenuButton`, with the choices of each item that shows
 * a submenu, such as All models of a model picker. Beside its trigger, it
 * opens on the surface of the shell menus, in the top layer, and it takes
 * its place again when its rows change. On a computer the choices open
 * beside the menu, level with their item, after a press, Enter, Space, or
 * the right arrow, which move the focus into them, and after a hover of a
 * mouse or a pen. A hover over another item hides them. With `inPlace`, as
 * in the phone layout and in a sheet, they take the place of the rows of
 * the menu, with Back at their top, because no room is beside the menu.
 * Back, the left arrow, and Escape hide them, and their item takes the
 * focus back. A pick in the choices closes the menu.
 */
export function OpenMenu(props: {
  label: string
  entries: readonly MenuEntry[]
  place: OpenPlace
  inPlace: boolean
  close: () => void
  busy: boolean
  wide?: boolean
}) {
  const list = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const { entries, inPlace, busy, place } = props
  const submenu = useSubmenu(
    entries.flatMap((entry) => (entry.kind === 'submenu' ? [entry.id] : [])),
    list,
    inPlace ? list : layer,
  )
  const open =
    entries.find(
      (entry): entry is MenuSubmenu =>
        entry.kind === 'submenu' && entry.id === submenu.open,
    ) ?? null
  const back = () => submenu.hide(true)
  const submenus: SubmenuControl = {
    open: submenu.open,
    show: (id, focus) => {
      if (id === null) submenu.hide(false)
      else submenu.show(id, focus)
    },
  }
  const onChoicesKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft') return
    event.preventDefault()
    back()
  }
  const replaced = open !== null && inPlace
  const lists = (
    <>
      <MenuList
        back={replaced ? back : undefined}
        busy={busy}
        close={props.close}
        entries={replaced ? (open.entries ?? []) : entries}
        hover={!inPlace}
        label={replaced ? open.label : props.label}
        listRef={list}
        placement={place === 'sheet' ? 'sheet' : 'anchored'}
        submenus={submenus}
        wide={props.wide}
      />
      {open && !inPlace ? (
        <SubmenuLayer layer={layer} menu={list} onKeyDown={onChoicesKey}>
          <MenuList
            busy={busy}
            close={props.close}
            entries={open.entries ?? []}
            focus={false}
            label={open.label}
            placement="anchored"
          />
        </SubmenuLayer>
      ) : null}
    </>
  )
  if (place === 'sheet') return lists
  return (
    <PopoverSurface
      align={place.placement.endsWith('end') ? 'end' : 'start'}
      anchor={place.anchor}
      className={ui.menuLayer}
      options={SURFACE_OPTIONS}
      side={place.placement.startsWith('above') ? 'above' : 'below'}
    >
      {lists}
    </PopoverSurface>
  )
}
