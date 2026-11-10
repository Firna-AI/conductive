import { createContext, useContext, type ReactNode } from 'react'
import { archivedWorkspaceList } from '../../fixtures/archivedWorkspaces'
import {
  workspaceSections,
  type SidebarSection,
  type WorkspaceRow,
} from '../workspaces/sections'

/**
 * A session of a linked workspace, as the chat read it when it loaded: its
 * ID in the address of the session, its title, or null before it has one,
 * and whether its tab is closed. `to` is the screen that shows the
 * session, when the mockups draw it.
 */
export type ChatSession = {
  id: string
  title: string | null
  closed: boolean
  to?: string
}

/**
 * A workspace that a chat finds for its chips, with the sessions that the
 * chat read for it, open and closed. A workspace whose sessions the chat
 * did not read has none, so a link to one of its sessions shows the chip
 * of the workspace.
 */
export type ChatRow = WorkspaceRow & { sessions?: readonly ChatSession[] }

/**
 * The workspaces of the org that a chat finds for its chips: the rows of
 * the list, with their states and their screens, and the archived
 * workspaces, which the list keeps in its Archived group.
 */
export function orgRows(sections: readonly SidebarSection[]): WorkspaceRow[] {
  const archived = archivedWorkspaceList.map((workspace): WorkspaceRow => ({
    workspace,
    status: 'archived',
    selected: false,
  }))
  return [...sections.flatMap((section) => section.rows), ...archived]
}

const ChatWorkspacesContext = createContext<readonly ChatRow[]>(
  orgRows(workspaceSections()),
)

/**
 * Gives each chat inside it the workspaces of the org as the list of the
 * screen has them, also on a phone, where no list is on the screen.
 * Without it, a chat finds the workspaces of the list when the app opens.
 */
export function ChatWorkspaces(props: {
  rows: readonly ChatRow[]
  children: ReactNode
}) {
  return (
    <ChatWorkspacesContext.Provider value={props.rows}>
      {props.children}
    </ChatWorkspacesContext.Provider>
  )
}

/** The workspaces of the org that the chat finds for its chips. */
export function useChatWorkspaces(): readonly ChatRow[] {
  return useContext(ChatWorkspacesContext)
}
