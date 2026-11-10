import type { ReactNode } from 'react'
import { Check, ChevronLeft, Copy, Download, FileText } from 'lucide-react'
import styles from '../../../files/page/FilePage.module.css'
import a11y from '../../../files/ui/a11y.module.css'
import { IconButton } from '../../../files/ui/actions'
import { classes } from '../../../files/ui/classes'
import { focusClass } from '../../../files/ui/layout'
import { AppLink } from '../../ui/AppLink'
import type { DocumentStatus } from './use-document-text'

/**
 * The folder that the label of an old session names, as the Markdown view
 * of the app shows each file under its folder.
 */
const FOLDER = 'Conductor'

/**
 * The header of the page of an old session, in the look of a file page:
 * the way back to the chat on a phone, its name under Conductor, Download,
 * its count of messages, Copy, and the switch between the rendered Markdown
 * and its source. Download and Copy wait for the Markdown.
 */
export function DocumentHeader(props: {
  name: string
  /** The address of the chat, for the way back of a phone. */
  back?: string
  meta?: string
  onDownload?: () => void
  onCopy?: () => void
  status: DocumentStatus
  viewSwitch: ReactNode
}) {
  const copied = props.status === 'copied'
  return (
    <div className={styles.header}>
      <div className={styles.start}>
        {props.back ? (
          <AppLink
            aria-label="Back to Chat"
            className={classes(styles.back, focusClass)}
            to={props.back}
          >
            <ChevronLeft aria-hidden size={15} />
            <span className={styles.backLabel}>Chat</span>
          </AppLink>
        ) : null}
        <span className={styles.chip} title={`${FOLDER}/${props.name}`}>
          <FileText aria-hidden className={styles.icon} size={13} />
          <span className={styles.folder}>{FOLDER}/</span>
          <span className={styles.name}>{props.name}</span>
        </span>
        {props.onDownload ? (
          <IconButton
            icon={Download}
            label={`Download ${props.name}`}
            onPress={props.onDownload}
          />
        ) : null}
      </div>
      <div className={styles.end}>
        <span
          className={
            props.status === 'copy-failed' ? styles.failed : a11y.hidden
          }
          role="status"
        >
          {props.status === 'copy-failed'
            ? "The text didn't copy. Try again."
            : copied
              ? 'Copied'
              : ''}
        </span>
        {props.meta ? <span className={styles.meta}>{props.meta}</span> : null}
        <IconButton
          icon={copied ? Check : Copy}
          label={copied ? 'Copied' : `Copy the text of ${props.name}`}
          onPress={props.onCopy}
        />
        {props.viewSwitch}
      </div>
    </div>
  )
}
