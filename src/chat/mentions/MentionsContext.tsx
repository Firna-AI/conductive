import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { FileEntry } from '../../shared/files'
import { mentionable } from './mention-rows'

/**
 * What the chat reads of the kept files of the workspace: the store of the
 * Files screens fits it. `tree` is null until a tree loads.
 */
export interface MentionFilesSnapshot {
  tree: { entries: ReadonlyMap<string, FileEntry> } | null
  /** Why the tree did not load, while no tree shows. */
  treeError: unknown
  /** The cloud computer could not read the files. */
  treeUnavailable: boolean
}

/** The kept files, as a store that the chat follows. */
interface MentionFiles {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => MentionFilesSnapshot
}

/**
 * The files and folders that the composer of a workspace chat can mention,
 * and what a press on a chip does (decisions 213 and 214). The shell gives
 * them. Each function stays the same while the workspace shows.
 */
export interface ChatMentions {
  files: MentionFiles
  /** Opens a file, as a press on the file in All files does. */
  openFile: (path: string) => void
  /** Shows All files with the folder open. */
  showFolder: (path: string) => void
  /** The address of the page that a chip opens, for a link. */
  href: (entry: FileEntry) => string
}

/**
 * The tree as the list of `@` and the chips find it: still loading, not
 * available, or ready with its entries.
 */
export type MentionTree =
  | { state: 'loading' }
  | { state: 'unavailable' }
  | { state: 'ready'; entries: ReadonlyMap<string, FileEntry> }

const loading: MentionTree = { state: 'loading' }
const unavailable: MentionTree = { state: 'unavailable' }

/** The tree of a snapshot. A saved tree that is marked unavailable still shows. */
function treeOf(snapshot: MentionFilesSnapshot): MentionTree {
  const { tree } = snapshot
  if (tree && (tree.entries.size > 0 || !snapshot.treeUnavailable)) {
    return { state: 'ready', entries: tree.entries }
  }
  if (snapshot.treeUnavailable || snapshot.treeError) return unavailable
  return loading
}

const MentionsContext = createContext<ChatMentions | null>(null)

/** Gives the composer and the messages inside it the files of the workspace. */
export function MentionsProvider(props: {
  value: ChatMentions | null
  children: ReactNode
}) {
  return (
    <MentionsContext.Provider value={props.value}>
      {props.children}
    </MentionsContext.Provider>
  )
}

/** The mentions of the chat, or null where no file can be mentioned. */
export function useChatMentions(): ChatMentions | null {
  return useContext(MentionsContext)
}

function followNothing(): () => void {
  return () => undefined
}

const noFiles = (): MentionFilesSnapshot | null => null

/** The tree that the chat follows now, or null without mentions. */
export function useMentionTree(): MentionTree | null {
  const mentions = useChatMentions()
  const files = mentions?.files ?? null
  const snapshot = useSyncExternalStore(
    files?.subscribe ?? followNothing,
    files?.getSnapshot ?? noFiles,
    files?.getSnapshot ?? noFiles,
  )
  return useMemo(() => (snapshot ? treeOf(snapshot) : null), [snapshot])
}

/**
 * Finds the entry of the tree that a mention names: a folder or a file, as
 * the mention says. Only an entry that the list offers counts.
 */
export function findMentioned(
  tree: MentionTree,
  path: string,
  folder: boolean,
): FileEntry | undefined {
  if (tree.state !== 'ready') return undefined
  const entry = tree.entries.get(path)
  if (!entry || (entry.kind === 'directory') !== folder) return undefined
  return mentionable(entry) ? entry : undefined
}
