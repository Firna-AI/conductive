import { useContext, useMemo } from 'react'
import type { ChatMentions } from '../../../chat/mentions/MentionsContext'
import type { WorkspaceFiles } from '../../../files/model/files-store'
import {
  createPictureReads,
  type ChatPictures,
} from '../../../files/page/picture-reads'
import type { FilesNavigation, FilesTarget } from '../../../files/navigation'
import type { FileEntry } from '../../../shared/generated/FileEntry'
import type { LineRange } from '../../../shared/line-target'
import { PanelContext } from '../../layout/panels'
import type { WorkspaceContext } from '../features'

type MentionsWorkspace = Pick<
  WorkspaceContext,
  'viewport' | 'sandbox' | 'panel' | 'resumingAtOpen' | 'skills'
>

/** Shares the cache while the tab keeps the workspace's files and chat. */
const pictureReaders = new WeakMap<WorkspaceFiles, ChatPictures>()

function picturesOf(files: WorkspaceFiles): ChatPictures {
  const known = pictureReaders.get(files)
  if (known) return known
  const reader = createPictureReads(files.client)
  pictureReaders.set(files, reader)
  return reader
}

/**
 * The page of a chip: the file, or All files for a folder. A file with
 * lines opens as text, also a Markdown file, because only the text has
 * line numbers.
 */
function chipTarget(entry: FileEntry, lines?: LineRange): FilesTarget {
  return entry.kind === 'directory'
    ? { kind: 'list', list: 'all' }
    : { kind: 'file', path: entry.path, mode: lines ? 'source' : 'preview' }
}

/**
 * The files that the composer lists after `@`, the skills that it lists
 * after `/`, and the pages of the chips. A file opens as a press in All
 * files opens it. A folder shows All files with the folder open, in the
 * right column on desktop, which then shows.
 */
export function useMentions(
  context: MentionsWorkspace,
  files: WorkspaceFiles | null,
  navigation: FilesNavigation,
): ChatMentions | undefined {
  const panels = useContext(PanelContext)
  const phone = context.viewport === 'phone'
  const { skills } = context
  const pictures =
    files &&
    context.sandbox === 'ready' &&
    context.panel === null &&
    !context.resumingAtOpen
      ? picturesOf(files)
      : undefined
  return useMemo(() => {
    if (!files) return undefined
    return {
      files,
      skills,
      pictures,
      openFile: (path, lines) =>
        navigation.navigate(
          { kind: 'file', path, mode: lines ? 'source' : 'preview' },
          lines,
        ),
      showFolder: (path) => {
        files.revealFolder(path)
        if (!phone) panels?.rightShown.set(true)
        navigation.navigate({ kind: 'list', list: 'all' })
      },
      href: (entry, lines) => navigation.href(chipTarget(entry, lines), lines),
    }
  }, [files, skills, navigation, panels, phone, pictures])
}
