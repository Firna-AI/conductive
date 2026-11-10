import { FileText, History } from 'lucide-react'
import styles from '../../../../docs/mockups/src/components/chat/LinkedLine.module.css'
import type { ImportSessionMetadata } from '../../../shared/import-session'
import { AppLink } from '../../ui/AppLink'

/**
 * The first line of a session that continues an old session from
 * Conductor, in the look of the line of a linked session. The title of the
 * old session opens its document. `prepared` says only that the app gave
 * the agent its old history, so the line claims no more than that the
 * session continues. `fallback` says that the history could not go to the
 * agent, so the session started fresh with its old chat.
 */
export function ResumedLine(props: {
  title: string
  preparation: ImportSessionMetadata['preparation']
  href: string
}) {
  const title = <AppLink to={props.href}>{props.title}</AppLink>
  if (props.preparation === 'prepared') {
    return (
      <p className={styles.line}>
        <History aria-hidden className={styles.icon} size={13} />
        <span>Continues {title} from Conductor</span>
      </p>
    )
  }
  return (
    <p className={styles.line}>
      <FileText aria-hidden className={styles.icon} size={13} />
      <span>
        {title} couldn&apos;t resume, so this session started fresh with its old
        chat
      </span>
    </p>
  )
}
