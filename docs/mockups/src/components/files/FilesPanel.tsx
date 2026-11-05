import type { ReactNode } from 'react'
import { changedFiles, fileTree } from '../../fixtures/files'
import type { BannerState } from '../../fixtures/pullRequests'
import { checksPaths, paths } from '../../paths'
import { LinkTabs } from '../common/LinkTabs'
import { PanelBar } from '../workspace/PanelBar'
import { ChangeList } from './ChangeList'
import { ChecksList } from './ChecksList'
import { FileTree } from './FileTree'
import styles from './FilesPanel.module.css'

/** The lists of the files panel. */
export const fileLists = ['all', 'changes', 'checks'] as const

export type FileList = (typeof fileLists)[number]

/** The kinds of file that open as a tab in the centre column. */
export type FileTabView = 'code' | 'markdown' | 'diff'

/** The All files, Changes, and Checks tabs, as links. */
function FileTabs(props: {
  view: FileList
  changes: number
  banner: BannerState
}) {
  return (
    <PanelBar>
      <LinkTabs
        label="Files"
        tabs={[
          {
            label: 'All files',
            to: paths.filesAll,
            selected: props.view === 'all',
          },
          {
            label: 'Changes',
            to: paths.filesChanges,
            count: props.changes > 0 ? props.changes : undefined,
            selected: props.view === 'changes',
          },
          {
            label: 'Checks',
            to: checksPaths[props.banner],
            selected: props.view === 'checks',
          },
        ]}
      />
    </PanelBar>
  )
}

/**
 * The files of the workspace: the All files, Changes, and Checks tabs. A
 * file opens as a tab in the centre column, and `open` marks its row. A
 * branch without edits has no changes yet. While the sandbox does not run,
 * `placeholder` replaces the file lists; the checks come from GitHub and
 * still show.
 */
export function FilesPanel(props: {
  view: FileList
  edited: boolean
  banner: BannerState
  open?: FileTabView
  placeholder?: ReactNode
}) {
  const { view, open } = props
  const changes = props.edited ? changedFiles : []
  const tree = props.edited
    ? fileTree
    : fileTree.map((entry) => ({ ...entry, change: undefined }))
  const treeOpen = open === 'code' || open === 'markdown' ? open : undefined
  return (
    <div className={styles.files}>
      <FileTabs banner={props.banner} changes={changes.length} view={view} />
      {view === 'checks' ? <ChecksList state={props.banner} /> : null}
      {view !== 'checks' && props.placeholder ? props.placeholder : null}
      {view === 'all' && !props.placeholder ? (
        <div className={styles.scroll} data-mokly-scroll="file-tree">
          <FileTree entries={tree} open={treeOpen} />
        </div>
      ) : null}
      {view === 'changes' && !props.placeholder ? (
        <ChangeList diffOpen={open === 'diff'} files={changes} />
      ) : null}
    </div>
  )
}
