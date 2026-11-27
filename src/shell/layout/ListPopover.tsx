import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { classes } from '../../ui/components/common/classes'
import frame from '../../ui/components/layout/AppFrame.module.css'
import { useHref, useNavigation } from '../../app/navigation'
import { useStore } from '../../app/store'
import { useMacApp, useNarrowWindow } from '../mac/mac-app'
import { isPlainClick } from '../ui/AppLink'
import { LayersContext } from '../ui/layers'
import { useLayerFocus } from '../ui/Overlay'
import { usePanelLayout } from './panels'
import { SidebarPlaceContext, useSidebarShown } from './sidebar-toggle'

/** What the tile of the current org needs from its list popover. */
export interface ListPopoverTile {
  /** The popover is open, while the tile can open it. */
  expanded?: boolean
  /** The id of the open popover. */
  controls?: string
  /** Takes the link of the tile, which the focus goes back to. */
  tileRef: (node: HTMLAnchorElement | null) => void
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void
}

/** A field where Escape belongs to the text, such as a rename field. */
function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.matches('input, textarea, select'))
  )
}

/**
 * Closes the popover on a press outside it and outside its tile, and on
 * Escape. A press or a key while a menu or a dialog is open belongs to that
 * layer, such as a row menu of the list or the palette, so the popover
 * stays. Escape counts only after the page had it: a field of the popover,
 * such as a rename field, cancels on Escape, and a key that a handler took
 * or that an input method composes does not close the popover. An Escape
 * that closes it stops the default action of the key, so the page takes no
 * other action for it, such as a close of the temporary tab.
 */
function useDismiss(
  parts: readonly RefObject<HTMLElement | null>[],
  close: () => void,
): void {
  const layers = useContext(LayersContext)
  useEffect(() => {
    const inside = (target: EventTarget | null) =>
      target instanceof Node &&
      parts.some((part) => part.current?.contains(target))
    const layerOpen = () => layers?.menuOpen() || layers?.modalOpen()
    const onPointer = (event: PointerEvent) => {
      if (inside(event.target) || layerOpen()) return
      close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (event.isComposing || layerOpen()) return
      if (inside(event.target) && isTextField(event.target)) return
      // The key closes the popover, so no other Escape action of the page runs.
      event.preventDefault()
      close()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [parts, layers, close])
}

/**
 * The open popover: the whole sidebar beside the rail. The focus moves into
 * it as it opens, to the row of the open page, else to its first control.
 * As it closes, the focus goes back to the tile, or to the new page when
 * the address changed.
 */
function ListPopoverSurface(props: {
  id: string
  tile: RefObject<HTMLAnchorElement | null>
  openedAt: string
  close: () => void
  children: ReactNode
}) {
  const { tile, close } = props
  const surface = useRef<HTMLElement | null>(null)
  const navigation = useNavigation()
  const width = useStore(usePanelLayout().chosenWidth.sidebar)
  const mac = useMacApp()
  const [parts] = useState(() => [surface, tile])
  const [current] = useState(() => ({
    get current(): HTMLElement | null {
      return (
        surface.current?.querySelector<HTMLElement>('[aria-current="page"]') ??
        null
      )
    },
  }))
  useLayerFocus(surface, {
    modal: false,
    initial: current,
    moved: () => navigation.href() !== props.openedAt,
    returnFocus: () => tile.current?.focus(),
  })
  useDismiss(parts, close)

  /** A link or a control that opens a dialog leaves the popover. */
  const onClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target
    if (!(target instanceof Element) || !isPlainClick(event)) return
    const control = target.closest('a[href], [aria-haspopup="dialog"]')
    if (control && surface.current?.contains(control)) close()
  }

  return (
    <section
      aria-label="Workspace list"
      className={classes(frame.popover, mac !== null && frame.cornerPopover)}
      id={props.id}
      onClick={onClick}
      ref={surface}
      style={width === null ? undefined : { width }}
    >
      <SidebarPlaceContext.Provider value="popover">
        {props.children}
      </SidebarPlaceContext.Provider>
    </section>
  )
}

/**
 * The list popover of the rail (list popover decisions 1 B, 2 B, and 3 A).
 * On a page with a sidebar that shows no workspace list, a plain click on
 * the tile of the current org opens the whole sidebar beside the rail. The
 * sidebar shows no list when its toggle hid it, and in a narrow window.
 * The list page of a narrow window shows its list already, so its tile
 * opens no popover. A second click on the tile, Escape, a press outside,
 * a link, and a control that opens a dialog close it, and so does a new
 * address. A tile of another org opens its org as before. `sidebar` is the
 * sidebar of the frame, and `listPage` says that the page is the list page
 * of the org.
 */
export function useListPopover(props: {
  sidebar?: ReactNode
  listPage: boolean
}): { tile: ListPopoverTile; popover: ReactNode } {
  const shown = useSidebarShown()
  const narrow = useNarrowWindow()
  const href = useHref()
  const id = useId()
  const tile = useRef<HTMLAnchorElement | null>(null)
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const available =
    props.sidebar !== undefined && !shown && !(narrow && props.listPage)
  // A new address, or a list that shows again, closes the popover.
  if (openedAt !== null && (openedAt !== href || !available)) {
    setOpenedAt(null)
  }
  const open = openedAt !== null && openedAt === href && available
  const close = useCallback(() => setOpenedAt(null), [])

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!available || !isPlainClick(event)) return
    event.preventDefault()
    setOpenedAt(open ? null : href)
  }
  const tileRef = useCallback((node: HTMLAnchorElement | null) => {
    tile.current = node
  }, [])

  return {
    tile: {
      expanded: available ? open : undefined,
      controls: open ? id : undefined,
      tileRef,
      onClick,
    },
    popover: open ? (
      <ListPopoverSurface close={close} id={id} openedAt={href} tile={tile}>
        {props.sidebar}
      </ListPopoverSurface>
    ) : null,
  }
}
