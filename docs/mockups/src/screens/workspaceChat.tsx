import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { useMacApp } from '../../../../src/ui/components/mac/MacApp'
import { ChatWorkspaces, type ChatRow } from '../components/chat/chatWorkspaces'
import { defined, plainData } from '../defined'
import { chatPane } from '../entries/components/chat/ChatPane.mockup'
import { composerData } from '../entries/components/chat/capabilitiesSlot'
import { emptyState } from '../entries/components/common/EmptyState.mockup'
import { suspendedOrgNotice } from '../entries/components/orgs/SuspendedOrgNotice.mockup'
import type { ChatItem } from '../fixtures/conversations'
import { chatItemsFor } from '../fixtures/maskedFiles'
import type { PersonKey } from '../fixtures/members'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import type { Workspace } from '../fixtures/workspaces'
import { composerFor } from './composerFor'
import { composerNotice } from './composerNotice'
import { stackPagesOf } from './requestStackPages'
import { startingLogFor } from './workspaceParts'
import { sandboxNotice } from './workspaceSandbox'
import type { WorkspaceState } from './workspaceState'
import { noMessages } from './workspaceTabs'

/**
 * The chat of an open workspace: the transcript, the request stack, and the
 * composer, with the workspaces of the screen for its chips. A new session
 * shows its empty state in place of the transcript. The workspace screen
 * imports this module first so the styles of the chat load first.
 */
export function WorkspaceChat(props: {
  state: WorkspaceState
  workspace: Workspace
  items: readonly ChatItem[]
  rows: readonly ChatRow[]
  picker?: ReactNode
  viewer: PersonKey
  viewport: Viewport
}) {
  const { state, workspace, viewport } = props
  const mac = useMacApp()
  const pages = stackPagesOf(state.conversation, mac !== undefined)
  const stack =
    state.shownRequest > 1 || pages
      ? { place: state.shownRequest, pages }
      : undefined
  const items = noMessages(state) ? [] : chatItemsFor(props.items, state.paths)
  const problem = sandboxNotice(state)
  const starting = startingLogFor(state)
  // A suspended org's notice stays above the bar of an archived workspace.
  const notice =
    state.sandbox === 'archived' && state.org === 'suspended' ? (
      <suspendedOrgNotice.Component
        moklyInstance="suspended-org-notice"
        org={{ name: orgs[suspendedOrg].name }}
      />
    ) : (
      composerNotice(state, workspace)
    )
  // The open Capabilities control and a picker in place of the model
  // picker are not data, so they go in slots.
  const box = composerData({
    ...composerFor(state, workspace, viewport),
    pickerPart: props.picker,
  })
  return (
    <ChatWorkspaces rows={props.rows}>
      <chatPane.Component
        composer={plainData(box.composer)}
        empty={
          <emptyState.Component
            body={`The agent works on ${workspace.branch}, on the same cloud computer as the other sessions.`}
            icon="message-square-plus"
            moklyInstance="new-session-empty"
            title="New session"
          />
        }
        fold={state.fold}
        items={plainData(items)}
        moklyInstance="chat"
        viewer={props.viewer}
        viewport={viewport}
        {...defined({
          capabilitiesPanel: box.capabilitiesPanel,
          pickerPart: box.pickerPart,
          notice,
          pictures: state.sandbox === 'ready' ? state.pictures : undefined,
          problem: problem && plainData(problem),
          stack: stack && plainData(stack),
          starting: starting && plainData(starting),
        })}
      />
    </ChatWorkspaces>
  )
}
