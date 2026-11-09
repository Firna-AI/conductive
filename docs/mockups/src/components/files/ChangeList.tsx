import { FileDiff } from 'lucide-react'
import { splitPath, type ChangedFile } from '../../fixtures/files'
import { EmptyState } from '../common/EmptyState'
import { ScreenLink } from '../common/ScreenLink'
import { ChangeIcon } from './ChangeIcon'
import { DiffStat } from './DiffStat'
import { paths } from '../../paths'
import { classes } from '../common/classes'
import styles from './ChangeList.module.css'

function Row(props: { file: ChangedFile; open: boolean; diffTo: string }) {
  const { file } = props
  const { folder, name } = splitPath(file.path)
  const content = (
    <>
      <span className={styles.path}>
        {folder ? <span className={styles.folder}>{folder}/</span> : null}
        <span className={styles.name}>{name}</span>
      </span>
      <DiffStat added={file.added} removed={file.removed} />
      <ChangeIcon change={file.change} />
    </>
  )
  if (!file.diff) return <div className={styles.row}>{content}</div>
  return (
    <ScreenLink
      aria-current={props.open ? 'page' : undefined}
      className={classes(styles.row, props.open && styles.open)}
      to={props.diffTo}
    >
      {content}
    </ScreenLink>
  )
}

/** The number of changed files, and the lines that they add and remove. */
function Summary(props: { files: readonly ChangedFile[] }) {
  const count = props.files.length
  const added = props.files.reduce((sum, file) => sum + file.added, 0)
  const removed = props.files.reduce((sum, file) => sum + file.removed, 0)
  return (
    <div className={styles.summary}>
      <span className={styles.count}>
        {count} {count === 1 ? 'file' : 'files'} changed
      </span>
      <DiffStat added={added} removed={removed} />
    </div>
  )
}

/**
 * The files that the workspace branch changes, against the default branch,
 * under a summary of the whole change. A file opens its diff as a tab, and
 * the row of the open diff is marked. `diffTo` is the page of that diff.
 */
export function ChangeList(props: {
  files: readonly ChangedFile[]
  diffOpen: boolean
  diffTo?: string
}) {
  if (props.files.length === 0) {
    return (
      <EmptyState
        body="Files that the agent edits appear as it works."
        icon={FileDiff}
        title="Changes show here"
      />
    )
  }
  return (
    <>
      <Summary files={props.files} />
      <div className={styles.scroll} data-mokly-scroll="changes">
        <ul aria-label="Changed files" className={styles.list}>
          {props.files.map((file) => (
            <li key={file.path}>
              <Row
                diffTo={props.diffTo ?? paths.diff}
                file={file}
                open={props.diffOpen && file.diff === true}
              />
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
