import type { RefObject } from 'react'
import { classes } from '../../ui/components/common/classes'
import styles from '../../ui/components/layout/ResizeHandle.module.css'
import { filesShare } from '../../ui/components/layout/ResizeHandle'
import { useStore } from '../../app/store'
import { usePanelLayout } from './panels'
import { useResizeHandle } from './useResizeHandle'

/**
 * The handle on the top edge of the tools panel. It moves the split of the
 * right column between the file lists above it and the tools panel. It
 * takes the drag and the keys of `useResizeHandle`: Up and Down move it.
 * The split is a share of the height of both parts, so each step of the
 * pointer or of a key turns its px into percent of that height. The app
 * remembers the split in the browser.
 */
export function SplitHandle(props: {
  label: string
  filesRef: RefObject<HTMLElement | null>
  toolsRef: RefObject<HTMLElement | null>
}) {
  const split = usePanelLayout().split
  const value = useStore(split.share) ?? filesShare.value
  /** The percent of the height of both parts in one px. */
  const scale = (): number => {
    const height =
      (props.filesRef.current?.offsetHeight ?? 0) +
      (props.toolsRef.current?.offsetHeight ?? 0)
    return height > 0 ? 100 / height : 0
  }
  const handle = useResizeHandle({
    y: {
      sign: 1,
      scale,
      drag: () => split.drag(value),
      step: (move) => split.step(value, move),
    },
  })
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
