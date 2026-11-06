import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/layout/ResizeHandle.module.css'
import { panelRanges, type Panel } from '../../app/panels'
import { useStore } from '../../app/store'
import { usePanelWidths } from './panels'

const step = 8
const bigStep = 32

/**
 * The handle on the inner edge of a resizable panel. It drags with the
 * pointer, and the arrow keys, Home, and End move it from the keyboard.
 * The app remembers each width in the browser.
 */
export function ResizeHandle(props: {
  label: string
  /** The edge of the panel that the handle sits on. */
  edge: 'left' | 'right'
  panel: Panel
  /** The width of the panel without its border, as it shows now. */
  measure: () => number
}) {
  const widths = usePanelWidths()
  const state = useStore(widths.widths)
  const range = panelRanges[props.panel]
  const [drag, setDrag] = useState<{ x: number; width: number } | null>(null)
  /** The handle on the left edge widens its panel as it moves left. */
  const sign = props.edge === 'right' ? 1 : -1
  const current = (): number => props.measure() || widths.width(props.panel)
  const value = Math.round(state[props.panel] ?? range.value)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ x: event.clientX, width: current() })
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const width = drag.width + sign * (event.clientX - drag.x)
    widths.set(props.panel, width, { save: false })
  }
  const endDrag = () => {
    if (!drag) return
    setDrag(null)
    widths.set(props.panel, widths.width(props.panel))
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const amount = event.shiftKey ? bigStep : step
    const moves: Record<string, number> = {
      ArrowRight: current() + sign * amount,
      ArrowLeft: current() - sign * amount,
      Home: range.min,
      End: range.max,
    }
    const next = moves[event.key]
    if (next === undefined) return
    event.preventDefault()
    widths.set(props.panel, next)
  }
  return (
    <div
      aria-label={props.label}
      aria-orientation="vertical"
      aria-valuemax={range.max}
      aria-valuemin={range.min}
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
