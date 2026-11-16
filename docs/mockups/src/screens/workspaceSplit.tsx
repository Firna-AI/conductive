import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { ChatPane } from '../components/chat/ChatPane'
import { FilePage } from '../components/files/FilePage'
import type { MenuEntry } from '../components/common/Menu'
import { SandboxBar } from '../components/workspace/SandboxNotice'
import { replacesComposer } from '../components/workspace/sandboxNoticeState'
import { SplitColumn } from '../components/workspace/SplitColumn'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { TabMenuSheet } from '../components/workspace/TabMenu'
import { debounceTurn } from '../fixtures/sessionLinkConversations'
import { workspaceSessions } from '../fixtures/sessions'
import type { Workspace } from '../fixtures/workspaces'
import { composerFor } from './composerFor'
import type { ChatProps } from './workspaceChat'
import {
  diffTabKey,
  readmeTabKey,
  splitPlanOf,
  type SplitState,
} from './workspacePanes'
import { filePlaceholder } from './workspaceParts'
import type { WorkspaceState } from './workspaceState'
import { codeTabKey } from './workspaceTabRow'

const [first, second] = workspaceSessions

/** The share of the left pane while the user drags the divider, in percent. */
const draggedShare = 40

/**
 * The centre column of a state with split panes, under the header. The
 * left pane can show the chat of the state, Debounce the address lookups to
 * 250 ms shows its finished turn with an empty message field, and the code
 * file, README.md, and the diff of AddressForm.tsx show as their pages. A
 * bar of the sandbox that takes the place of the message field, such as
 * the bar of an archived workspace, shows once, under both panes, with the
 * notice above it. `menuTab` is the tab whose menu is open.
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
  menuTab?: string
}) {
  const { state, viewport, chat, readOnly } = props
  const plan = splitPlanOf(props.panes, props.tabs, {
    viewport,
    readOnly,
    menuTab: props.menuTab,
  })
  const placeholder = filePlaceholder(state, true)
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
        return <FilePage placeholder={placeholder} view="code" />
      case readmeTabKey:
        return <FilePage placeholder={placeholder} view="markdown" />
      case diffTabKey:
        return <FilePage placeholder={placeholder} view="diff" />
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
      readOnly={readOnly}
      row={plan.row}
      share={state.resize === 'panes' ? draggedShare : undefined}
      viewport={viewport}
    />
  )
}

/**
 * The tab menu of a phone, as a sheet. With split panes, it reads the one
 * row with the session tabs of both panes, so a move can cross the border
 * of the two parts. A phone shows one row, so the item of split panes
 * decision 4 B is off there.
 */
export function PhoneTabMenu(props: {
  state: WorkspaceState
  row: { tabs: readonly WorkspaceTab[]; menuTab: string; readOnly: boolean }
}) {
  const { state, row } = props
  const plan =
    state.panes === 'one'
      ? undefined
      : splitPlanOf(state.panes, row.tabs, {
          viewport: 'mobile',
          readOnly: row.readOnly,
        })
  const place = {
    readOnly: row.readOnly,
    split: (plan?.panes.length ?? 1) > 1,
    phone: true,
    border: plan?.row.border,
  }
  return (
    <TabMenuSheet
      place={place}
      tab={row.menuTab}
      tabs={plan?.row.tabs ?? row.tabs}
    />
  )
}
