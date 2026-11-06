import { CircleSlash, X } from 'lucide-react'
import { IconButton } from '../common/actions'
import { lostText, type LostReason, type LostWhat } from './lostCopy'
import styles from './LostUpdate.module.css'

/** A refused runner event that belongs to no session, such as a file update. */
export type LostUpdateMarker = {
  what: LostWhat
  reason: LostReason
  /** The time since the update was lost, such as "4m ago". */
  ago: string
}

function Text(props: { marker: LostUpdateMarker }) {
  const { marker } = props
  return (
    <>
      <CircleSlash aria-hidden className={styles.icon} size={14} />
      <span className={styles.text}>
        {lostText(marker.what, marker.reason)}
      </span>
      <span className={styles.ago}>{marker.ago}</span>
    </>
  )
}

/**
 * Option B for an update without a session: a bar under the workspace
 * header, above the tabs, so it shows on every tab until Dismiss.
 */
export function LostUpdateBar(props: { marker: LostUpdateMarker }) {
  return (
    <div className={styles.bar} role="status">
      <Text marker={props.marker} />
      <IconButton icon={X} label="Dismiss" quiet />
    </div>
  )
}

/**
 * Option A for an update without a session: a row under the file lists of
 * the Files panel, in the column beside the chat or the Files tab of a phone.
 */
export function LostUpdateRow(props: { marker: LostUpdateMarker }) {
  return (
    <div className={styles.row} role="status">
      <Text marker={props.marker} />
    </div>
  )
}
