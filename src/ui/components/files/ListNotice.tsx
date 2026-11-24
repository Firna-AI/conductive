import { Info } from 'lucide-react'
import { omittedText, type OmittedList } from './listNoticeCopy'
import styles from './ListNotice.module.css'

/**
 * The notice of a file list that leaves out entries: a row at the top of
 * All files, or under the summary of Changes. It says how many entries the
 * list does not show, and where the member finds them. It does not scroll
 * with the rows, so it stays in view. The notice of a list that is not the
 * latest one keeps its own row under the lists.
 */
export function ListNotice(props: { list: OmittedList; count: number }) {
  return (
    <p className={styles.notice} role="note">
      <Info aria-hidden className={styles.icon} size={14} />
      <span className={styles.text}>
        {omittedText(props.list, props.count)}
      </span>
    </p>
  )
}
