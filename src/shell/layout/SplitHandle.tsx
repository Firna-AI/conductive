import {
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/layout/ResizeHandle.module.css'
import { filesShare } from '../../../docs/mockups/src/components/layout/ResizeHandle'
import type { PanelDrag } from '../../app/panels'
import { dividerKey } from '../../app/shortcuts/navigation'
import { useStore } from '../../app/store'
import { dividerMove } from './divider-move'
import { usePanelLayout } from './panels'

/**
 * The handle on the top edge of the tools panel. It moves the split of the
 * right column between the file lists above it and the tools panel. It
 * drags with the pointer. From the keyboard, Up and Down move it, alone or
 * with Shift for a larger step, and Home and End move it to an end. A key
 * with other modifiers stays free for its shortcut. The split is a share of
 * the height of both parts, so each step of the pointer or of a key turns
 * its px into percent of that height. The app remembers the split in the
 * browser.
 */
export function SplitHandle(props: {
  label: string
  filesRef: RefObject<HTMLElement | null>
  toolsRef: RefObject<HTMLElement | null>
}) {
  const split = usePanelLayout().split
  const value = useStore(split.share) ?? filesShare.value
  const [drag, setDrag] = useState<{
    y: number
    scale: number
    drag: PanelDrag
  } | null>(null)
  /** The percent of the height of both parts in one px. */
  const scale = (): number => {
    const height =
      (props.filesRef.current?.offsetHeight ?? 0) +
      (props.toolsRef.current?.offsetHeight ?? 0)
    return height > 0 ? 100 / height : 0
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ y: event.clientY, scale: scale(), drag: split.drag(value) })
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    drag?.drag.move((event.clientY - drag.y) * drag.scale)
  }
  const endDrag = () => {
    if (!drag) return
    setDrag(null)
    drag.drag.end()
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = dividerKey(event.nativeEvent, 'horizontal')
    if (key === null) return
    event.preventDefault()
    split.step(value, dividerMove(key, 1, scale()))
  }
  return (
    <div
      aria-label={props.label}
      aria-orientation="horizontal"
      aria-valuemax={filesShare.max}
      aria-valuemin={filesShare.min}
      aria-valuenow={Math.round(value)}
      className={classes(
        styles.handle,
        styles.top,
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
