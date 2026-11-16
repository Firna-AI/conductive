import { splitPath, type ChangedFile } from '../../fixtures/files'
import { emptyState } from '../../entries/components/common/EmptyState.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { changeIcon } from '../../entries/components/files/ChangeIcon.mockup'
import { diffStat } from '../../entries/components/files/DiffStat.mockup'
import { instanceKey } from '../../instanceKey'
import { paths } from '../../paths'
import { classes } from '../common/classes'
import styles from './ChangeList.module.css'

function Row(props: { file: ChangedFile; open: boolean; diffTo: string }) {
  const { file } = props
  const { folder, name } = splitPath(file.path)
  const key = instanceKey(file.path)
  const content = (
    <>
      <span className={styles.path}>
        {folder ? <span className={styles.folder}>{folder}/</span> : null}
        <span className={styles.name}>{name}</span>
      </span>
      <diffStat.Component
        added={file.added}
        moklyInstance={`stat-${key}`}
        removed={file.removed}
      />
      <changeIcon.Component
        change={file.change}
        moklyInstance={`change-${key}`}
      />
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
      <diffStat.Component
        added={added}
        moklyInstance="summary-stat"
        removed={removed}
      />
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
      <emptyState.Component
        body="Files that the agent edits appear as it works."
        icon="file-diff"
        moklyInstance="changes-empty"
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
