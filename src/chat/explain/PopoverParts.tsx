import { useRef } from 'react'
import { Maximize2, X } from 'lucide-react'
import { classes } from '../../ui/components/common/classes'
import sheet from '../../ui/components/common/Sheet.module.css'
import {
  closeLabel,
  expandLabel,
} from '../../ui/components/explain/explainCopy'
import popover from '../../ui/components/explain/ExplainPopover.module.css'
import { IconButton } from '../ui/actions'
import styles from './explain.module.css'

/**
 * The top of the popover: the quote that it explains, then Expand and the
 * close button. The quote keeps to two lines, and its tooltip holds all of
 * it. The popover shows no written prompt, so the quote names what the
 * chat under it is about. An unsent Ask has no tab, so it has no Expand,
 * and the close button keeps its place at the end.
 */
export function PopoverHeader(props: {
  quote: string
  onExpand?: () => void
  onClose: () => void
}) {
  return (
    <div className={popover.header}>
      <p className={popover.quote} title={props.quote}>
        “{props.quote}”
      </p>
      {props.onExpand ? (
        <IconButton
          icon={Maximize2}
          label={expandLabel}
          onPress={props.onExpand}
        />
      ) : null}
      <IconButton icon={X} label={closeLabel} onPress={props.onClose} />
    </div>
  )
}

/** The distance that a drag of the handle moves the sheet to another height. */
const dragStep = 24

/**
 * The handle of the phone sheet, as every sheet draws it. A drag up takes
 * the sheet to full height, a drag down back to half height, and a tap
 * switches between them. The sheet scrolls its chat at either height, so
 * the keyboard needs no handle.
 */
export function SheetHandle(props: {
  full: boolean
  onFull: (full: boolean) => void
}) {
  const from = useRef<number | null>(null)
  return (
    <span
      aria-hidden
      className={classes(sheet.handle, styles.drag)}
      onPointerCancel={() => {
        from.current = null
      }}
      onPointerDown={(event) => {
        from.current = event.clientY
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerUp={(event) => {
        const start = from.current
        from.current = null
        if (start === null) return
        const moved = event.clientY - start
        if (moved < -dragStep) props.onFull(true)
        else if (moved > dragStep) props.onFull(false)
        else props.onFull(!props.full)
      }}
    />
  )
}
