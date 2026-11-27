import { useEffect, useState, type RefObject } from 'react'
import { classes } from '../../ui/components/common/classes'
import styles from '../../ui/components/layout/ResizeHandle.module.css'
import { panelRanges, type Panel } from '../../app/panels'
import { useStore } from '../../app/store'
import { usePanelLayout } from './panels'
import { useResizeHandle } from './useResizeHandle'

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
 * The handle on the inner edge of a resizable panel. It takes the drag and
 * the keys of `useResizeHandle`: Left and Right move it. Each move starts
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
  const chosen = useStore(widths.chosenWidth[props.panel])
  const range = panelRanges[props.panel]
  const shown = useShownWidth(props.panelRef)
  /** The handle on the left edge widens its panel as it moves left. */
  const sign: 1 | -1 = props.edge === 'right' ? 1 : -1
  const current = (): number =>
    props.panelRef.current?.clientWidth || widths.width(props.panel)
  const value = Math.round(shown ?? chosen ?? range.value)
  const handle = useResizeHandle({
    x: {
      sign,
      drag: () => widths.drag(props.panel, current()),
      step: (move) => widths.step(props.panel, current(), move),
    },
  })
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
        handle.dragging && styles.active,
      )}
      role="separator"
      tabIndex={0}
      {...handle.handlers}
    >
      <span aria-hidden className={styles.line} />
      <span aria-hidden className={styles.grip} />
    </div>
  )
}
