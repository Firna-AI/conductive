import { memo, useState, type ReactNode } from 'react'
import { TouchScreen } from '../../../docs/mockups/src/components/common/touch'
import { ChatDropAreaProvider, useChatDropArea } from './chat-drop-area'
import { CodeCopyProvider, type CopyCode } from './code-copy'
import type { ChatProps, RowProps } from './column-parts'
import type { ComposerFocus } from './Composer'
import { SessionChat } from './SessionChat'
import { SessionTabs } from './SessionTabs'
import { TabNodes } from './tab-nodes'
import { viewTabOf, type RowTab } from './tab-row'
import { useTabDrag } from './useTabDrag'
import local from './PhoneChat.module.css'

/**
 * The chat of the shown session. A drag of a tab draws the phone again at
 * each move of the pointer, and changes nothing here, so this part keeps
 * its last drawing.
 */
const PhoneContent = memo(function PhoneContent(props: {
  chat: ChatProps
  copyCode: CopyCode
  composerFocus: ComposerFocus | null
  sessionId: string | null
}) {
  return (
    <CodeCopyProvider value={props.copyCode}>
      <SessionChat
        {...props.chat}
        composerFocus={props.composerFocus}
        sessionId={props.sessionId}
      />
    </CodeCopyProvider>
  )
})

/**
 * The chat on a phone: one row, with the session tabs of the left pane, a
 * short neutral line, and the session tabs of the right pane, then one +,
 * which opens a session in the focused pane, and the session history at
 * its end. Under it, the chat of `sessionId`: the shown session of the
 * focused pane, else of the other pane, else the last session of the
 * focused pane, because a phone shows files only in its Files tab. A press
 * on a tab of the other pane makes that pane the focused pane. A drag moves
 * a tab across the line to the other pane, at its drop place, as
 * `useTabDrag` says, and a drop on the chat moves nothing. The pane item of
 * the tab menu is off. The whole column is the drop area of the message
 * box. `children` are the overlays.
 */
export function PhoneChat(props: {
  tabs: readonly RowTab[]
  sessionId: string | null
  row: RowProps
  chat: ChatProps
  copyCode: CopyCode
  composerFocus?: ComposerFocus | null
  /** The saved view holds two panes. */
  splitView: boolean
  onNew: () => void
  children?: ReactNode
}) {
  const { row, splitView } = props
  const drops = useChatDropArea()
  const [nodes] = useState(() => new TabNodes())
  const drag = useTabDrag({
    rows: [{ tabs: props.tabs, pane: null }],
    nodes,
    split: splitView,
    enabled: !row.readOnly,
    renaming: row.renaming,
    onPaneMove: (tab, target) => row.onMove(viewTabOf(tab), target),
  })
  return (
    <TouchScreen>
      <div className={local.phone} {...drops.handlers}>
        <ChatDropAreaProvider value={drops.slot}>
          <SessionTabs
            {...row}
            drag={drag.row(0)}
            onNew={props.onNew}
            paneItem={{ split: splitView, move: null }}
            tabs={props.tabs}
          />
          <div className={local.content} ref={drag.contentRef(0)}>
            <PhoneContent
              chat={props.chat}
              composerFocus={props.composerFocus ?? null}
              copyCode={props.copyCode}
              sessionId={props.sessionId}
            />
          </div>
          {props.children}
        </ChatDropAreaProvider>
      </div>
    </TouchScreen>
  )
}
