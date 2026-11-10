import { EntryIcon } from '../files/fileIcons'
import { entryFolder, entryName } from './entryPaths'
import { allFilesUnavailable } from './lostCopy'
import { mentionRows } from './fileMentions'
import { MentionList } from './MentionList'

/**
 * The file tree as the list of `@` finds it: the latest tree, a tree that
 * still loads, or no tree, because the cloud computer could not read the
 * files and no list was saved before.
 */
export type MentionTree = 'latest' | 'loading' | 'unavailable'

/**
 * The list of `@` of the mockups, for the query after the last `@` of the
 * draft: the files and folders of the sample tree that match, with the
 * first row highlighted. One line takes the place of the rows while the
 * tree loads, when no tree is available, and when nothing matches.
 */
export function FileMentionList(props: { query: string; tree: MentionTree }) {
  const entries = props.tree === 'latest' ? mentionRows(props.query) : []
  let line: string | null = null
  if (props.tree === 'loading') line = 'Loading files…'
  else if (props.tree === 'unavailable') {
    line = allFilesUnavailable.title
  } else if (entries.length === 0) line = `Nothing matches “${props.query}”`
  return (
    <MentionList
      highlighted={entries.length > 0 ? 0 : null}
      id="file-mentions"
      line={line}
      rows={entries.map((entry) => ({
        key: entry.path,
        name: entryName(entry),
        folder: entryFolder(entry),
        icon: (
          <EntryIcon folder={entry.folder} name={entryName(entry)} size={14} />
        ),
      }))}
    />
  )
}
