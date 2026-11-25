import { paths } from './paths'

/**
 * The limited page of each file page: the page that a link opens while the
 * lists of a workspace are limited, so the reader stays with the lists of
 * the large branch. It covers All files, Changes, and the tabs of the diff,
 * the code file, and the Markdown file. `WorkspaceScreen` and the page of
 * the registered files panel give the table to `ScreenLink` through
 * `LinkPages`. A link to any other page keeps its page, such as the Checks
 * tab, the tools, and the other views of a workspace.
 */
export const limitedListPaths: ReadonlyMap<string, string> = new Map([
  [paths.filesAll, 'app/files/limited'],
  [paths.filesChanges, 'app/files/changes/limited'],
  [paths.diff, 'app/files/diff/limited'],
  [paths.code, 'app/files/code/limited'],
  [paths.markdown, 'app/files/markdown/limited'],
])

/**
 * The page that a link to `page` opens while the lists are limited: its
 * limited page from the table, or `page` when the table names none, as
 * `ScreenLink` reads the table.
 */
export function limitedPageOf(page: string): string {
  return limitedListPaths.get(page) ?? page
}
