import type { RefCallback } from 'react'
import type { BranchChangedFile } from '../../shared/generated/BranchChangedFile'
import type { ChangesResponse } from '../../shared/generated/ChangesResponse'
import { formatCount } from '../../ui/components/common/counts'
import { wholeChange } from '../../ui/components/files/changeTotals'
import { ListNotice } from '../../ui/components/files/ListNotice'
import { hidesSecret, pathLabel } from '../model/file-labels'
import { splitPath, type DiffTab, type FilesNavigation } from '../navigation'
import { ChangeIcon, changeLabels } from '../ui/ChangeIcon'
import { DiffStat } from '../ui/DiffStat'
import { FilesLink } from '../ui/FilesLink'
import { classes } from '../ui/classes'
import type { MenuRow, RowMenuItems } from './row-menu'
import { useRowMenu, type RowMenuBinding } from './useRowMenu'
import styles from './ChangeList.module.css'

/**
 * A row of Changes as its menu reads it: the file name of its label, and
 * its path, which is the new path of a moved file and the old path of a
 * deleted one.
 */
function menuRowOf(file: BranchChangedFile): MenuRow {
  const { path, change } = file
  return {
    path,
    name: splitPath(pathLabel(file)).name,
    target: hidesSecret(file) ? null : { path, kind: 'file', change },
  }
}

function Row({
  ref,
  ...props
}: {
  file: BranchChangedFile
  open: boolean
  navigation: FilesNavigation
  menu: Omit<RowMenuBinding, 'ref'>
  /** The link of the row, for the focus after its menu closes. */
  ref: RefCallback<HTMLElement>
}) {
  const { file, menu } = props
  const { folder, name } = splitPath(pathLabel(file))
  const previous = file.previousDisplayPath ?? file.previousPath
  const label = previous
    ? `${changeLabels[file.change]} from ${previous}`
    : undefined
  const tab: DiffTab = { kind: 'diff', path: file.path }
  return (
    <FilesLink
      {...menu.handlers}
      aria-current={props.open ? 'page' : undefined}
      className={classes(
        styles.row,
        menu.className,
        menu.open && styles.menuOpen,
        props.open && styles.open,
      )}
      navigation={props.navigation}
      onDoubleClick={() => props.navigation.keep(tab)}
      ref={ref}
      to={tab}
    >
      <span className={styles.path}>
        {folder ? <span className={styles.folder}>{folder}/</span> : null}
        <span className={styles.name}>{name}</span>
      </span>
      <DiffStat added={file.added} removed={file.removed} />
      <ChangeIcon change={file.change} label={label} />
    </FilesLink>
  )
}

/**
 * The files that the branch changes against the default branch, under the
 * totals of the whole change. The totals include the files that the report
 * leaves out, and a notice under them says how many it leaves out. The rows
 * keep the order of the report. A row is a link to the diff of its file,
 * and the row of the open diff is marked. A double-click on a row keeps the
 * tab that the row opens. A row shows the label of its path, and its real
 * path stays its key and its target. Each row opens the menu of `rowMenu`,
 * as `useRowMenu` says, and keeps the fill of a hover while it is open.
 */
export function ChangeList(props: {
  changes: ChangesResponse
  openPath: string | null
  navigation: FilesNavigation
  /** The items of the menu of each row. Without it, no row has a menu. */
  rowMenu?: RowMenuItems
}) {
  const { changes } = props
  const { files } = changes
  const totals = wholeChange(changes.summary, changes.omitted)
  const omitted = changes.omitted?.files ?? 0
  const menuRows = files.map(menuRowOf)
  const menu = useRowMenu(props.rowMenu, menuRows)
  return (
    <>
      <div className={styles.summary}>
        <span className={styles.count}>
          {formatCount(totals.files)} {totals.files === 1 ? 'file' : 'files'}{' '}
          changed
        </span>
        <DiffStat added={totals.added} removed={totals.removed} />
      </div>
      {omitted > 0 ? <ListNotice count={omitted} list="changes" /> : null}
      <div className={styles.scroll}>
        <ul aria-label="Changed files" className={styles.list}>
          {files.map((file, index) => {
            const { ref, ...bound } = menu.bind(menuRows[index])
            return (
              <li key={file.path}>
                <Row
                  file={file}
                  menu={bound}
                  navigation={props.navigation}
                  open={file.path === props.openPath}
                  ref={ref}
                />
              </li>
            )
          })}
        </ul>
      </div>
      {menu.layer}
    </>
  )
}
