import {
  entryFolder,
  entryName,
} from '../../../../../src/ui/components/chat/entryPaths'
import { allFilesUnavailable } from '../../../../../src/ui/components/chat/lostCopy'
import { omittedMentionLine } from '../../../../../src/ui/components/files/listNoticeCopy'
import { retainedEntries } from '../../fixtures/limitedFiles'
import { mentionRows } from './fileMentions'
import { mentionList } from '../../entries/components/chat/MentionList.mockup'

/**
 * The file tree as the list of `@` finds it: the latest tree, a limited
 * tree that leaves out entries, as All files does for a large branch, a
 * tree that still loads, or no tree, because the cloud computer could not
 * read the files and no list was saved before.
 */
export type MentionTree = 'latest' | 'limited' | 'loading' | 'unavailable'

/** The rows of the list for the query, from the tree that it reads. */
function rowsOf(props: { query: string; tree: MentionTree }) {
  if (props.tree === 'latest') return mentionRows(props.query)
  if (props.tree === 'limited') {
    return mentionRows(props.query, retainedEntries)
  }
  return []
}

/**
 * The list of `@` of the mockups, for the query after the last `@` of the
 * draft: the files and folders of the sample tree that match, with the
 * first row highlighted. One line takes the place of the rows while the
 * tree loads, when no tree is available, and when nothing matches. In a
 * limited tree, the line of no match also says that some files are not
 * listed, and what the member can do.
 */
export function FileMentionList(props: { query: string; tree: MentionTree }) {
  const entries = rowsOf(props)
  let line: string | null = null
  if (props.tree === 'loading') line = 'Loading files…'
  else if (props.tree === 'unavailable') {
    line = allFilesUnavailable.title
  } else if (entries.length === 0) {
    line =
      props.tree === 'limited'
        ? omittedMentionLine(props.query)
        : `Nothing matches “${props.query}”`
  }
  return (
    <mentionList.Component
      highlighted={entries.length > 0 ? 0 : null}
      id="file-mentions"
      line={line}
      moklyInstance="mention-list"
      rows={entries.map((entry) => ({
        key: entry.path,
        name: entryName(entry),
        folder: entryFolder(entry),
        icon: entry.folder ? 'folder' : 'file',
      }))}
    />
  )
}
