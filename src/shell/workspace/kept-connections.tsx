import type { ReactNode } from 'react'
import type { WorkspaceContext } from './features'
import { useFilesPreviewConnection } from './previews/kept-files-preview'
import { usePreviewsConnection } from './previews/kept-previews'
import { useWorkspaceFiles } from './files/workspace-files'

/**
 * The one connection of the kept files, of the kept previews, and of the
 * kept files preview of the open workspace, for the whole screen: on
 * desktop and on each tab of a phone. So the pull request bar knows the
 * local work also while a phone shows the chat, the Preview tool and the
 * Preview tabs read one list, and each tab of an HTML file reads one files
 * preview. The parts that show files or previews only read the same stores.
 * An archived workspace has no file lists and no previews, so its stores
 * stay stopped.
 */
export function KeptConnections(props: {
  context: WorkspaceContext
  children: ReactNode
}) {
  useWorkspaceFiles(props.context, props.context.sandbox !== 'archived')
  usePreviewsConnection(props.context)
  useFilesPreviewConnection(props.context)
  return props.children
}
