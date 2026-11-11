import type { ReactNode } from 'react'
import { CircleSlash } from 'lucide-react'
import { splitPath } from '../../fixtures/files'
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
 * value, a file whose name the app does not know, and the Markdown file of
 * a session from Conductor.
 */
export type FileTabView =
  'code' | 'markdown' | 'diff' | 'masked-diff' | 'unnamed' | 'old-session'

/**
 * The screens of the list tabs for a workspace whose screens are not those
 * of every workspace. A tab without a screen there, or with null, stays
 * static.
 */
export type FileListLinks = Readonly<Partial<Record<FileList, string | null>>>

/** The All files, Changes, and Checks tabs, as links. */
function FileTabs(props: {
  view: FileList
  changes: number
  banner: BannerState
  links?: FileListLinks
}) {
  const { links } = props
  return (
    <PanelBar>
      <LinkTabs
        label="Files"
        tabs={[
          {
            label: 'All files',
            to: links ? (links.all ?? undefined) : paths.filesAll,
            selected: props.view === 'all',
          },
          {
            label: 'Changes',
            to: links ? (links.changes ?? undefined) : paths.filesChanges,
            count: props.changes > 0 ? props.changes : undefined,
            selected: props.view === 'changes',
          },
          {
            label: 'Checks',
            to: links ? (links.checks ?? undefined) : checksPaths[props.banner],
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
 * `links` gives the list tabs of a workspace whose screens are not those of
 * every workspace. Its rows are then static, because the mockups draw no
 * file of that workspace.
 * `checksTop` stands above the checks, such as the actions of the pull
 * request bar on a phone. `only` keeps the changes of these paths, such as
 * the changed files that moved to the new branch of Continue.
 */
export function FilesPanel(props: {
  view: FileList
  edited: boolean
  banner: BannerState
  tree: TreeState
  open?: FileTabView
  placeholder?: ReactNode
  paths?: PathState
  links?: FileListLinks
  checksTop?: ReactNode
  only?: readonly string[]
}) {
  const { view, open, links, only } = props
  const masked = props.paths === 'masked'
  const files = filesFor(props.paths ?? 'plain')
  const shown = props.edited
    ? files.changes.filter((file) => !only || only.includes(file.path))
    : []
  const changes = links
    ? shown.map((file) => ({ ...file, diff: false }))
    : shown
  const names = new Set(changes.map((file) => splitPath(file.path).name))
  const tree = files.tree.map((entry) => ({
    ...entry,
    change:
      props.edited && (!only || names.has(entry.name))
        ? entry.change
        : undefined,
    preview: links ? undefined : entry.preview,
  }))
  const treeOpen = open === 'code' || open === 'markdown' ? open : undefined
  const lists = !props.placeholder
  return (
    <div className={styles.files}>
      <FileTabs
        banner={props.banner}
        changes={changes.length}
        links={links}
        view={view}
      />
      {view === 'checks' ? props.checksTop : null}
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
