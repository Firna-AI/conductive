import type { ReactNode } from 'react'
import { LinkPages } from '../components/common/ScreenLink'
import type { ListState } from '../fixtures/limitedFiles'
import { limitedListPaths } from '../limitedListPaths'

/**
 * The links of a workspace screen. While the lists of the workspace are
 * limited, each link to a file page opens its limited page, so the reader
 * stays with the lists of the large branch: the rows and the tabs of the
 * lists, the back links and the Files tab of a phone, the file tabs of the
 * centre column, and the file chips of the chat. Complete lists keep every
 * page. The registered files panel uses it too, for its own page. Inside a
 * workspace screen, the table of the screen stays, as `LinkPages` says.
 */
export function WorkspaceLinks(props: {
  lists: ListState | undefined
  children: ReactNode
}) {
  if (props.lists !== 'limited') return props.children
  return <LinkPages table={limitedListPaths}>{props.children}</LinkPages>
}
