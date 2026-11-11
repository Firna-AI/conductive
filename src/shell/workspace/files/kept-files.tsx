import type { ReactNode } from 'react'
import type { WorkspaceContext } from '../features'
import { useWorkspaceFiles } from './workspace-files'

/**
 * The one connection of the kept files of the open workspace, for the whole
 * screen: on desktop and on each tab of a phone. So the pull request bar
 * knows the local work also while a phone shows the chat. The parts that
 * show files only read the same store, through `useKeptFiles`. An archived
 * workspace has no file lists, so its store stays stopped.
 */
export function KeptFilesConnection(props: {
  context: WorkspaceContext
  children: ReactNode
}) {
  useWorkspaceFiles(props.context, props.context.sandbox !== 'archived')
  return props.children
}
