import type { ReactNode } from 'react'
import { CircleSlash } from 'lucide-react'
import { withPublicOpen } from '../../fixtures/files'
import { filesFor, type PathState } from '../../fixtures/maskedFiles'
import type { BannerState } from '../../fixtures/pullRequests'
import { checksPaths, paths } from '../../paths'
import { allFilesUnavailable } from '../chat/lostCopy'
import { LostUpdateRow } from '../chat/LostUpdate'
import { EmptyState } from '../common/EmptyState'
import { LinkTabs } from '../common/LinkTabs'
import { PanelBar } from '../workspace/PanelBar'
import { ChangeList } from './ChangeList'
import { ChecksList } from './ChecksList'
import { FileTree } from './FileTree'
import styles from './FilesPanel.module.css'

/** The lists of the files panel. */
export const fileLists = ['all', 'changes', 'checks'] as const

export type FileList = (typeof fileLists)[number]

/**
 * The list of All files: the latest one, the one saved before the cloud
 * computer could not read the files, or none when it saved none before.
 */
export const treeStates = ['latest', 'saved', 'none'] as const

export type TreeState = (typeof treeStates)[number]

/**
 * The kinds of file that open as a tab in the centre column: a code file,
 * a Markdown file, a diff, the diff of a file whose label hides a secret
 * value, and a file whose name the app does not know. Then a picture of
 * the branch, an image whose bytes the browser cannot draw, and the copy
 * of an attached screenshot, which All files does not list.
 */
export type FileTabView =
  | 'code'
  | 'markdown'
  | 'diff'
  | 'masked-diff'
  | 'unnamed'
  | 'image'
  | 'image-not-drawn'
  | 'attachment'

/** The open tab whose row All files marks: a file of the tree. */
function treeTab(open: FileTabView | undefined) {
  switch (open) {
    case 'code':
    case 'markdown':
    case 'image':
    case 'image-not-drawn':
      return open
    default:
      return undefined
  }
}

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
 * branch without edits has no changes yet. A `placeholder`, such as the
 * state of a sandbox that starts, replaces the file lists. The checks come
 * from GitHub and still show. When the cloud computer could not read the
 * files, `tree` keeps the saved list under a notice, or says that no list
 * is available. `paths` adds two files whose labels hide a secret value.
 */
export function FilesPanel(props: {
  view: FileList
  edited: boolean
  banner: BannerState
  tree: TreeState
  open?: FileTabView
  placeholder?: ReactNode
  paths?: PathState
}) {
  const { view, open } = props
  const masked = props.paths === 'masked'
  const files = filesFor(props.paths ?? 'plain')
  const changes = props.edited ? files.changes : []
  const treeOpen = treeTab(open)
  // The images of the branch lie in the public folder, which their tabs open.
  const pictures = treeOpen === 'image' || treeOpen === 'image-not-drawn'
  const shown = pictures ? withPublicOpen(files.tree) : files.tree
  const tree = props.edited
    ? shown
    : shown.map((entry) => ({ ...entry, change: undefined }))
  const lists = !props.placeholder
  return (
    <div className={styles.files}>
      <FileTabs banner={props.banner} changes={changes.length} view={view} />
      {view === 'checks' ? <ChecksList state={props.banner} /> : null}
      {view !== 'checks' && props.placeholder ? props.placeholder : null}
      {view === 'all' && lists && props.tree === 'none' ? (
        <EmptyState
          body={allFilesUnavailable.body}
          icon={CircleSlash}
          title={allFilesUnavailable.title}
        />
      ) : null}
      {view === 'all' && lists && props.tree !== 'none' ? (
        <div className={styles.scroll} data-mokly-scroll="file-tree">
          <FileTree entries={tree} open={treeOpen} />
        </div>
      ) : null}
      {view === 'changes' && lists ? (
        <ChangeList
          diffOpen={open === 'diff' || open === 'masked-diff'}
          diffTo={masked ? paths.maskedPaths : paths.diff}
          files={changes}
        />
      ) : null}
      {props.tree === 'saved' ? (
        <LostUpdateRow repair={{ data: 'all-files' }} />
      ) : null}
    </div>
  )
}
