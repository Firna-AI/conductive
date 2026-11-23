import { paths } from './paths'

/**
 * The limited page of each file page: the page that a link opens while the
 * lists of a workspace are limited, so the reader stays with the lists of
 * the large branch. It covers All files, Changes, and the tabs of the diff,
 * the code file, and the Markdown file. `WorkspaceScreen` gives the table to
 * `ScreenLink` through `LinkPages`. A link to any other page keeps its page,
 * such as the Checks tab, the tools, and the other views of a workspace.
 */
export const limitedListPaths: ReadonlyMap<string, string> = new Map([
  [paths.filesAll, 'app/files/limited'],
  [paths.filesChanges, 'app/files/changes/limited'],
  [paths.diff, 'app/files/diff/limited'],
  [paths.code, 'app/files/code/limited'],
  [paths.markdown, 'app/files/markdown/limited'],
])
