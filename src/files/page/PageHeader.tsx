import type { ReactNode } from 'react'
import { Check, ChevronLeft, Copy, Download } from 'lucide-react'
import {
  splitPath,
  type FilesNavigation,
  type FilesTarget,
} from '../navigation'
import { FileIcon } from '../panel/file-icons'
import { IconButton } from '../ui/actions'
import { FilesLink } from '../ui/FilesLink'
import a11y from '../ui/a11y.module.css'
import type { ActionStatus } from './file-actions'
import styles from './FilePage.module.css'

export interface BackLink {
  label: string
  to: FilesTarget
}

const statusText: Readonly<Record<Exclude<ActionStatus, null>, string>> = {
  copied: 'Copied',
  'copy-failed': "The text didn't copy. Try again.",
  'download-failed': "The download didn't start. Try again.",
}

/**
 * The header of a file or diff page: the way back on a phone, the path,
 * Download, the line count or the changed lines, Copy, and the view switch.
 * An action without a handler is disabled.
 */
export function PageHeader(props: {
  path: string
  /** The page shows the diff of the file. */
  diff?: boolean
  navigation: FilesNavigation
  back?: BackLink
  meta?: ReactNode
  onDownload?: () => void
  downloading: boolean
  onCopy?: () => void
  status: ActionStatus
  viewSwitch?: ReactNode
}) {
  const { folder, name } = splitPath(props.path)
  const copied = props.status === 'copied'
  const failed = props.status !== null && !copied
  return (
    <div className={styles.header}>
      <div className={styles.start}>
        {props.back ? (
          <FilesLink
            aria-label={`Back to ${props.back.label}`}
            className={styles.back}
            navigation={props.navigation}
            to={props.back.to}
          >
            <ChevronLeft aria-hidden size={15} />
            <span className={styles.backLabel}>{props.back.label}</span>
          </FilesLink>
        ) : null}
        <span className={styles.chip} title={props.path}>
          <FileIcon
            className={styles.icon}
            diff={props.diff}
            path={props.path}
            size={13}
          />
          {folder ? <span className={styles.folder}>{folder}/</span> : null}
          <span className={styles.name}>{name}</span>
        </span>
        <IconButton
          busy={props.downloading}
          icon={Download}
          label={`Download ${name}`}
          onPress={props.onDownload}
        />
      </div>
      <div className={styles.end}>
        <span className={failed ? styles.failed : a11y.hidden} role="status">
          {props.status ? statusText[props.status] : ''}
        </span>
        {props.meta ? <span className={styles.meta}>{props.meta}</span> : null}
        <IconButton
          icon={copied ? Check : Copy}
          label={copied ? 'Copied' : `Copy the text of ${name}`}
          onPress={props.onCopy}
        />
        {props.viewSwitch}
      </div>
    </div>
  )
}
