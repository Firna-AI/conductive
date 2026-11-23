import { splitPath, type ChangedFile } from '../../fixtures/files'
import { emptyState } from '../../entries/components/common/EmptyState.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { changeIcon } from '../../entries/components/files/ChangeIcon.mockup'
import { diffStat } from '../../entries/components/files/DiffStat.mockup'
import { instanceKey } from '../../instanceKey'
import { RowMenuItem, type FileRowMenu } from './FileRowMenu'
import { paths } from '../../paths'
import { classes } from '../../../../../src/ui/components/common/classes'
import styles from './ChangeList.module.css'

/**
 * One changed file. The row of the open diff is marked, and the row of an
 * open menu keeps the fill of a hover, as a tab with an open menu does.
 */
function Row(props: {
  file: ChangedFile
  open: boolean
  menuOpen: boolean
  diffTo: string
}) {
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
  const className = classes(
    styles.row,
    props.menuOpen && styles.menuOpen,
    props.open && styles.open,
  )
  if (!file.diff) return <div className={className}>{content}</div>
  return (
    <ScreenLink
      aria-current={props.open ? 'page' : undefined}
      className={className}
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
 * `menu` is the open menu of a row, at the pointer or under a sheet.
 */
export function ChangeList(props: {
  files: readonly ChangedFile[]
  diffOpen: boolean
  diffTo?: string
  menu?: FileRowMenu
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
          {props.files.map((file) => {
            const menu = props.menu?.path === file.path ? props.menu : undefined
            return (
              <RowMenuItem key={file.path} menu={menu}>
                <Row
                  diffTo={props.diffTo ?? paths.diff}
                  file={file}
                  menuOpen={menu !== undefined}
                  open={props.diffOpen && file.diff === true}
                />
              </RowMenuItem>
            )
          })}
        </ul>
      </div>
    </>
  )
}
