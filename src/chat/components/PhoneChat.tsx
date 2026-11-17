import type { ReactNode } from 'react'
import { TouchScreen } from '../../../docs/mockups/src/components/common/touch'
import { ChatDropAreaProvider, useChatDropArea } from './chat-drop-area'
import { CodeCopyProvider, type CopyCode } from './code-copy'
import type { ChatProps, RowProps } from './column-parts'
import type { ComposerFocus } from './Composer'
import { SessionChat } from './SessionChat'
import { SessionTabs } from './SessionTabs'
import type { RowTab } from './tab-row'
import local from './PhoneChat.module.css'

/**
 * The chat on a phone: one row, with the session tabs of the left pane, a
 * short neutral line, and the session tabs of the right pane, then one +,
 * which opens a session in the focused pane, and the session history at
 * its end. Under it, the chat of `sessionId`: the shown session of the
 * focused pane, else of the other pane, else the last session of the
 * focused pane, because a phone shows files only in its Files tab. A press
 * on a tab of the other pane makes that pane the focused pane. The whole
 * column is the drop area of the message box. `children` are the overlays.
 */
export function PhoneChat(props: {
  tabs: readonly RowTab[]
  sessionId: string | null
  row: RowProps
  chat: ChatProps
  copyCode: CopyCode
  composerFocus?: ComposerFocus | null
  onNew: () => void
  children?: ReactNode
}) {
  const drops = useChatDropArea()
  return (
    <TouchScreen>
      <div className={local.phone} {...drops.handlers}>
        <ChatDropAreaProvider value={drops.slot}>
          <SessionTabs {...props.row} onNew={props.onNew} tabs={props.tabs} />
          <CodeCopyProvider value={props.copyCode}>
            <SessionChat
              {...props.chat}
              composerFocus={props.composerFocus}
              sessionId={props.sessionId}
            />
          </CodeCopyProvider>
          {props.children}
        </ChatDropAreaProvider>
      </div>
    </TouchScreen>
  )
}
