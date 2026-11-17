import {
  useEffect,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/layout/ResizeHandle.module.css'
import { evenShare, paneShareRange, type PaneSplit } from '../../app/pane-split'
import type { PanelDrag } from '../../app/panels'
import { dividerKey } from '../../app/shortcuts/navigation'
import { useStore } from '../../app/store'
import { dividerMove } from './divider-move'

/** The width of an element as the layout draws it, once it lays out. */
function useLaidOutWidth(element: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState<number | null>(null)
  useEffect(() => {
    const node = element.current
    if (!node) return
    const observer = new ResizeObserver(() => setWidth(node.clientWidth))
    observer.observe(node)
    return () => observer.disconnect()
  }, [element])
  return width
}

/**
 * The divider between the two panes of the centre column, over the hairline
 * on the edge of the left pane. It drags with the pointer. From the
 * keyboard, Left and Right move it, alone or with Shift for a larger step,
 * and Home and End move it to an end. A key with other modifiers stays free
 * for its shortcut. The split is the share of the left pane in the width of
 * the column, so each step of the pointer or of a key turns its px into
 * percent of that width. A move stops where a pane would get narrower than
 * 320 px, and a column narrower than 641 px keeps the divider at half, as
 * `paneShareRange` says. Each move starts from the share that shows. The
 * app remembers the split in the browser.
 */
export function PaneHandle(props: {
  label: string
  split: PaneSplit
  /** The panes side by side, whose width the split shares. */
  panesRef: RefObject<HTMLElement | null>
  /** The left pane, whose width shows the share. */
  leftRef: RefObject<HTMLElement | null>
}) {
  const { split, panesRef, leftRef } = props
  const stored = useStore(split.share) ?? evenShare
  const laidOut = useLaidOutWidth(panesRef)
  const [drag, setDrag] = useState<{
    x: number
    width: number
    drag: PanelDrag
  } | null>(null)
  /** The width of the column and the share of the left pane that show now. */
  const shown = () => {
    const width = panesRef.current?.clientWidth ?? 0
    const left = leftRef.current?.clientWidth ?? 0
    return { width, share: width > 0 ? (left / width) * 100 : stored }
  }
  const range = laidOut ? paneShareRange(laidOut) : { min: 0, max: 100 }
  const value = Math.min(range.max, Math.max(range.min, stored))

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const { width, share } = shown()
    if (event.button !== 0 || width <= 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const range = paneShareRange(width)
    setDrag({ x: event.clientX, width, drag: split.drag(share, range) })
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    drag?.drag.move(((event.clientX - drag.x) / drag.width) * 100)
  }
  const endDrag = () => {
    if (!drag) return
    setDrag(null)
    drag.drag.end()
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = dividerKey(event.nativeEvent)
    if (key === null) return
    event.preventDefault()
    const { width, share } = shown()
    if (width <= 0) return
    const move = dividerMove(key, 1, 100 / width)
    split.step(share, move, paneShareRange(width))
  }
  return (
    <div
      aria-label={props.label}
      aria-orientation="vertical"
      aria-valuemax={Math.round(range.max)}
      aria-valuemin={Math.round(range.min)}
      aria-valuenow={Math.round(value)}
      className={classes(
        styles.handle,
        styles.right,
        drag !== null && styles.active,
      )}
      onKeyDown={onKeyDown}
      onLostPointerCapture={endDrag}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      role="separator"
      tabIndex={0}
    >
      <span aria-hidden className={styles.line} />
      <span aria-hidden className={styles.grip} />
    </div>
  )
}
