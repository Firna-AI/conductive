import { createContext, useContext, type ReactNode } from 'react'
import { archivedWorkspaceList } from '../../fixtures/archivedWorkspaces'
import {
  workspaceSections,
  type SidebarSection,
  type WorkspaceRow,
} from '../workspaces/sections'

/**
 * The workspaces of the org that a chat finds for its chips: the rows of
 * the list, with their states and their screens, and the archived
 * workspaces, which the list keeps in its Archived group.
 */
export function orgRows(sections: readonly SidebarSection[]): WorkspaceRow[] {
  const archived = archivedWorkspaceList.map((workspace): WorkspaceRow => ({
    workspace,
    status: 'archived',
    github: workspace.github,
    selected: false,
  }))
  return [...sections.flatMap((section) => section.rows), ...archived]
}

const ChatWorkspacesContext = createContext<readonly WorkspaceRow[]>(
  orgRows(workspaceSections()),
)

/**
 * Gives each chat inside it the workspaces of the org as the list of the
 * screen has them, also on a phone, where no list is on the screen.
 * Without it, a chat finds the workspaces of the list when the app opens.
 */
export function ChatWorkspaces(props: {
  rows: readonly WorkspaceRow[]
  children: ReactNode
}) {
  return (
    <ChatWorkspacesContext.Provider value={props.rows}>
      {props.children}
    </ChatWorkspacesContext.Provider>
  )
}

/** The workspaces of the org that the chat finds for its chips. */
export function useChatWorkspaces(): readonly WorkspaceRow[] {
  return useContext(ChatWorkspacesContext)
}
