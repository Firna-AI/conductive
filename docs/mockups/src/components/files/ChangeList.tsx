import { splitPath, type ChangedFile } from '../../fixtures/files'
import type { ChangeTotals, LimitedTotals } from '../../fixtures/limitedFiles'
import { emptyState } from '../../entries/components/common/EmptyState.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { changeIcon } from '../../entries/components/files/ChangeIcon.mockup'
import { diffStat } from '../../entries/components/files/DiffStat.mockup'
import { listNotice } from '../../entries/components/files/ListNotice.mockup'
import { instanceKey } from '../../instanceKey'
import { RowMenuItem, type FileRowMenu } from './FileRowMenu'
import { paths } from '../../paths'
import { classes } from '../../../../../src/ui/components/common/classes'
import { formatCount } from '../../../../../src/ui/components/common/counts'
import {
  noChanges,
  wholeChange,
} from '../../../../../src/ui/components/files/changeTotals'
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

/** The totals of the listed files, which a list that leaves out none has. */
function totalsOf(files: readonly ChangedFile[]): ChangeTotals {
  return {
    files: files.length,
    added: files.reduce((sum, file) => sum + file.added, 0),
    removed: files.reduce((sum, file) => sum + file.removed, 0),
  }
}

/** The number of changed files, and the lines that they add and remove. */
function Summary(props: { totals: ChangeTotals }) {
  const { files, added, removed } = props.totals
  return (
    <div className={styles.summary}>
      <span className={styles.count}>
        {formatCount(files)} {files === 1 ? 'file' : 'files'} changed
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
 * `totals` belongs to a list that leaves out files: the summary then gives
 * the whole change, and a notice under it says how many files the rows do
 * not show. As in the app, the list is empty only when the whole change has
 * no file, so a list that leaves out every file still gives its totals.
 */
export function ChangeList(props: {
  files: readonly ChangedFile[]
  diffOpen: boolean
  diffTo?: string
  menu?: FileRowMenu
  totals?: LimitedTotals
}) {
  const listed = props.totals?.listed ?? totalsOf(props.files)
  const omitted = props.totals?.omitted
  if (noChanges(listed, omitted)) {
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
      <Summary totals={wholeChange(listed, omitted)} />
      {omitted && omitted.files > 0 ? (
        <listNotice.Component
          count={omitted.files}
          list="changes"
          moklyInstance="changes-omitted"
        />
      ) : null}
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
