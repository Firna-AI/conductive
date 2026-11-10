import type { ReactNode } from 'react'
import { FileText, MessageSquareX } from 'lucide-react'
import { formatSize } from '../../../docs/mockups/src/components/chat/sizes'
import styles from '../../../docs/mockups/src/components/conductor-import/ImportReport.module.css'
import type { UploadItem } from '../../app/import/import-uploads'
import { nameLabel } from '../../shared/name-label'

/** One list of the report: its heading, its reason, and its rows. */
function ReportList(props: {
  title: string
  reason: string
  children: ReactNode
}) {
  return (
    <section aria-label={props.title} className={styles.section}>
      <h2 className={styles.title}>{props.title}</h2>
      <p className={styles.reason}>{props.reason}</p>
      <ul className={styles.list}>{props.children}</ul>
    </section>
  )
}

/**
 * What the import did not bring in, as two lists, each with its reason,
 * from the results of the uploads. Each changed or untracked file over
 * 100 MiB stayed on this Mac, with its path, its workspace, and its size.
 * Each session whose session file is gone did not import, with its title
 * and its workspace. A list with no row does not show.
 */
export function ImportReport(props: { items: readonly UploadItem[] }) {
  const files = props.items.flatMap((item) =>
    item.files.map((file) => ({ ...file, workspace: item.row.name })),
  )
  const sessions = props.items.flatMap((item) =>
    item.sessions.map((session, index) => ({
      key: `${item.row.localWorkspaceId}:${index}`,
      title: nameLabel(session.title),
      workspace: item.row.name,
    })),
  )
  return (
    <>
      {files.length > 0 ? (
        <ReportList
          reason="These files are over 100 MiB, so they stay on this Mac."
          title="Stayed on this Mac"
        >
          {files.map((file) => (
            <li className={styles.row} key={`${file.workspace}:${file.path}`}>
              <FileText aria-hidden className={styles.icon} size={14} />
              <span className={styles.text}>
                <code className={styles.path}>{file.path}</code>
                <span className={styles.workspace}>{file.workspace}</span>
              </span>
              <span className={styles.size}>{formatSize(file.sizeBytes)}</span>
            </li>
          ))}
        </ReportList>
      ) : null}
      {sessions.length > 0 ? (
        <ReportList
          reason="Their session files are no longer on this Mac."
          title="Sessions not imported"
        >
          {sessions.map((session) => (
            <li className={styles.row} key={session.key}>
              <MessageSquareX aria-hidden className={styles.icon} size={14} />
              <span className={styles.text}>
                <span className={styles.session}>{session.title}</span>
                <span className={styles.workspace}>{session.workspace}</span>
              </span>
            </li>
          ))}
        </ReportList>
      ) : null}
    </>
  )
}
