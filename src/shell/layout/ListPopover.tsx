import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { useHref } from '../../app/navigation'
import { useStore } from '../../app/store'
import { useMacApp, useNarrowWindow } from '../mac/mac-app'
import { isPlainClick } from '../ui/AppLink'
import { LayersContext } from '../ui/layers'
import { focusableSelector, useEscapeLayer } from '../ui/Overlay'
import layout from './layout.module.css'
import { usePanelLayout } from './panels'
import { SidebarPlaceContext } from './sidebar-toggle'

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

/**
 * Closes the popover on a press outside it and outside its tile. A press
 * while a menu or a dialog is open belongs to that layer, such as a row
 * menu of the list, so the popover stays: the list owns that layer.
 */
function usePressOutside(
  open: boolean,
  parts: readonly RefObject<HTMLElement | null>[],
  close: () => void,
): void {
  const layers = useContext(LayersContext)
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (parts.some((part) => part.current?.contains(target))) return
      if (layers?.menuOpen() || layers?.modalOpen()) return
      close()
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open, parts, layers, close])
}

/**
 * The list popover of the rail (list popover decisions 1 B, 2 B, and 3 A).
 * On a page with a sidebar that shows no workspace list, a plain click on
 * the tile of the current org opens the whole sidebar beside the rail. The
 * sidebar shows no list when its toggle hid it, and in a narrow window.
 * The list page of a narrow window shows its list already, so its tile
 * opens no popover. A second click on the tile, Escape, a press outside,
 * a link, and a control that opens a dialog close it, and so does a new
 * address. Escape gives the focus back to the tile. A tile of another org
 * opens its org as before. `sidebar` is the sidebar of the frame, and
 * `listPage` says that the page is the list page of the org.
 */
export function useListPopover(props: {
  sidebar?: ReactNode
  listPage: boolean
}): { tile: ListPopoverTile; popover: ReactNode } {
  const panels = usePanelLayout()
  const shown = useStore(panels.sidebarShown)
  const widths = useStore(panels.widths)
  const narrow = useNarrowWindow()
  const mac = useMacApp()
  const href = useHref()
  const id = useId()
  const tile = useRef<HTMLAnchorElement | null>(null)
  const surface = useRef<HTMLElement | null>(null)
  const [opened, setOpened] = useState<{ at: string; keys: boolean } | null>(
    null,
  )
  const available =
    props.sidebar !== undefined && (narrow ? !props.listPage : !shown)
  // A new address, or a list that shows again, closes the popover.
  if (opened && (opened.at !== href || !available)) setOpened(null)
  const open = opened !== null && opened.at === href && available

  const close = useCallback(() => setOpened(null), [])
  useEscapeLayer(open, () => {
    close()
    tile.current?.focus()
  })
  const [parts] = useState(() => [surface, tile])
  usePressOutside(open, parts, close)

  // A popover that the keys opened takes the focus, on its current row.
  useLayoutEffect(() => {
    const node = surface.current
    if (!opened?.keys || !node || node.contains(document.activeElement)) {
      return
    }
    const target =
      node.querySelector<HTMLElement>('[aria-current="page"]') ??
      node.querySelector<HTMLElement>(focusableSelector)
    target?.focus()
  }, [opened])

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!available || !isPlainClick(event)) return
    event.preventDefault()
    // A click from the keys, Enter on the focused tile, has no detail.
    setOpened(open ? null : { at: href, keys: event.detail === 0 })
  }
  const tileRef = useCallback((node: HTMLAnchorElement | null) => {
    tile.current = node
  }, [])

  /** A link or a control that opens a dialog leaves the popover. */
  const onSurfaceClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target
    if (!(target instanceof Element) || !isPlainClick(event)) return
    const control = target.closest('a[href], [aria-haspopup="dialog"]')
    if (control && surface.current?.contains(control)) close()
  }

  const width = widths.sidebar
  const popover = open ? (
    <section
      aria-label="Workspace list"
      className={classes(
        layout.listPopover,
        mac !== null && layout.cornerPopover,
      )}
      id={id}
      onClick={onSurfaceClick}
      ref={surface}
      style={width === null ? undefined : { width }}
    >
      <SidebarPlaceContext.Provider value="popover">
        {props.sidebar}
      </SidebarPlaceContext.Provider>
    </section>
  ) : null
  return {
    tile: {
      expanded: available ? open : undefined,
      controls: open ? id : undefined,
      tileRef,
      onClick,
    },
    popover,
  }
}
