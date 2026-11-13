import {
  useEffect,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/layout/ResizeHandle.module.css'
import { panelRanges, type Panel, type PanelDrag } from '../../app/panels'
import { dividerKey } from '../../app/shortcuts/navigation'
import { useStore } from '../../app/store'
import { dividerMove } from './divider-move'
import { usePanelLayout } from './panels'

/** The width that a panel shows, without its border, as the layout draws it. */
function useShownWidth(panel: RefObject<HTMLElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null)
  useEffect(() => {
    const node = panel.current
    if (!node) return
    const observer = new ResizeObserver(() => setWidth(node.clientWidth))
    observer.observe(node)
    return () => observer.disconnect()
  }, [panel])
  return width
}

/**
 * The handle on the inner edge of a resizable panel. It drags with the
 * pointer. From the keyboard, Left and Right move it, alone or with Shift
 * for a larger step, and Home and End move it to an end. A key with other
 * modifiers, such as ⌥⌘←, stays free for its shortcut. Each move starts
 * from the width that the panel shows, which the layout can make narrower
 * than the range of the panel. The app remembers each width in the browser.
 */
export function ResizeHandle(props: {
  label: string
  /** The edge of the panel that the handle sits on. */
  edge: 'left' | 'right'
  panel: Panel
  /** The panel that the handle resizes. */
  panelRef: RefObject<HTMLElement | null>
}) {
  const widths = usePanelLayout()
  const state = useStore(widths.widths)
  const range = panelRanges[props.panel]
  const shown = useShownWidth(props.panelRef)
  const [drag, setDrag] = useState<{ x: number; drag: PanelDrag } | null>(null)
  /** The handle on the left edge widens its panel as it moves left. */
  const sign: 1 | -1 = props.edge === 'right' ? 1 : -1
  const current = (): number =>
    props.panelRef.current?.clientWidth || widths.width(props.panel)
  const value = Math.round(shown ?? state[props.panel] ?? range.value)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ x: event.clientX, drag: widths.drag(props.panel, current()) })
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    drag?.drag.move(sign * (event.clientX - drag.x))
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
    widths.step(props.panel, current(), dividerMove(key, sign))
  }
  return (
    <div
      aria-label={props.label}
      aria-orientation="vertical"
      aria-valuemax={Math.max(value, range.max)}
      aria-valuemin={Math.min(value, range.min)}
      aria-valuenow={value}
      className={classes(
        styles.handle,
        styles[props.edge],
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
