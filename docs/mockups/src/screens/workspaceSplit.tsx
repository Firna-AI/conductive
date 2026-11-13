import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { ChatPane } from '../components/chat/ChatPane'
import { FilePage } from '../components/files/FilePage'
import type { MenuEntry } from '../components/common/Menu'
import { SandboxBar } from '../components/workspace/SandboxNotice'
import { replacesComposer } from '../components/workspace/sandboxNoticeState'
import { SplitColumn } from '../components/workspace/SplitColumn'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { debounceTurn } from '../fixtures/sessionLinkConversations'
import { workspaceSessions } from '../fixtures/sessions'
import type { Workspace } from '../fixtures/workspaces'
import { composerFor } from './composerFor'
import type { ChatProps } from './workspaceChat'
import { splitPlanOf, type SplitState } from './workspacePanes'
import { filesPlaceholder } from './workspaceParts'
import type { WorkspaceState } from './workspaceState'
import { codeTabKey } from './workspaceTabRow'

const [first, second] = workspaceSessions

/** The share of the left pane while the user drags the divider, in percent. */
const draggedShare = 40

/**
 * The centre column of a state with split panes, under the header. The
 * left pane can show the chat of the state, Debounce the address lookups to
 * 250 ms shows its finished turn with an empty message field, and the code
 * file shows as its page. A bar of the sandbox that takes the place of the
 * message field, such as the bar of an archived workspace, shows once,
 * under both panes, with the notice above it.
 */
export function WorkspaceSplit(props: {
  state: WorkspaceState
  panes: SplitState
  viewport: Viewport
  /** The tabs that the viewport shows, in the order of one row. */
  tabs: readonly WorkspaceTab[]
  /** The chat of the first session, as one pane draws it. */
  chat: ChatProps
  workspace: Workspace
  readOnly: boolean
  historyEntries: readonly MenuEntry[]
}) {
  const { state, viewport, chat } = props
  const plan = splitPlanOf(props.panes, props.tabs, viewport, props.readOnly)
  const shared = chat.problem !== undefined && replacesComposer(chat.problem)
  const paneChat: ChatProps = shared
    ? { ...chat, composer: undefined, notice: undefined, problem: undefined }
    : chat
  const contentOf = (key: string | undefined): ReactNode => {
    switch (key) {
      case first.key:
        return <ChatPane {...paneChat} />
      case second.key:
        return (
          <ChatPane
            {...paneChat}
            composer={
              shared
                ? undefined
                : composerFor(
                    { ...state, composer: 'empty' },
                    props.workspace,
                    viewport,
                  )
            }
            items={debounceTurn}
            scrollName="chat-transcript-second"
          />
        )
      case codeTabKey:
        return (
          <FilePage placeholder={filesPlaceholder(state, true)} view="code" />
        )
      default:
        return null
    }
  }
  return (
    <SplitColumn
      focused={plan.focused}
      footer={
        shared && chat.problem ? (
          <>
            {chat.notice}
            <SandboxBar {...chat.problem} />
          </>
        ) : undefined
      }
      historyEntries={props.historyEntries}
      panes={plan.panes.map((pane) => ({
        ...pane,
        content: contentOf(pane.shown),
      }))}
      readOnly={props.readOnly}
      row={plan.row}
      share={state.resize === 'panes' ? draggedShare : undefined}
      viewport={viewport}
    />
  )
}
