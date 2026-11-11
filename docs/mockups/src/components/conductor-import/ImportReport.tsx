import type { ReactNode } from 'react'
import { FileText } from 'lucide-react'
import type { ConductorRow } from '../../fixtures/conductorImport'
import type { ImportReport } from '../../fixtures/conductorUploads'
import { AgentMark } from '../chat/AgentMark'
import { formatSize } from '../chat/sizes'
import styles from './ImportReport.module.css'

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
 * What the import did not bring in, as two lists, each with its own
 * reason. Each changed or untracked file over 100 MiB stayed on this Mac,
 * with its path, its workspace, and its size. Each session whose memory
 * file is gone did not import, with its name and its workspace, and the
 * workspace has no document for it. A list with no row does not show.
 * `rows` names the workspace of each row.
 */
export function ImportReportLists(props: {
  report: ImportReport
  rows: readonly ConductorRow[]
}) {
  const { files, sessions } = props.report
  const nameOf = (id: string) =>
    props.rows.find((row) => row.id === id)?.name ?? ''
  return (
    <>
      {files.length > 0 ? (
        <ReportList
          reason="These files are over 100 MiB, so they stay on this Mac."
          title="Stayed on this Mac"
        >
          {files.map((file) => (
            <li className={styles.row} key={file.path}>
              <FileText aria-hidden className={styles.icon} size={14} />
              <span className={styles.text}>
                <code className={styles.path}>{file.path}</code>
                <span className={styles.workspace}>{nameOf(file.row)}</span>
              </span>
              <span className={styles.size}>{formatSize(file.bytes)}</span>
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
            <li className={styles.row} key={session.title}>
              <AgentMark agent={session.agent} />
              <span className={styles.text}>
                <span className={styles.session}>{session.title}</span>
                <span className={styles.workspace}>{nameOf(session.row)}</span>
              </span>
            </li>
          ))}
        </ReportList>
      ) : null}
    </>
  )
}
