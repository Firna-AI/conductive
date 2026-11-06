import { useRef, type ReactNode } from 'react'
import {
  Files,
  Globe,
  MessageSquare,
  Monitor,
  SquareTerminal,
  type LucideIcon,
} from 'lucide-react'
import chat from '../../../docs/mockups/src/components/chat/ChatPane.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import tabs from '../../../docs/mockups/src/components/workspace/MobileTabBar.module.css'
import column from '../../../docs/mockups/src/components/workspace/RightColumn.module.css'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import { ResizeHandle } from '../layout/ResizeHandle'
import { usePanelWidths } from '../layout/panels'
import { AppLink } from '../ui/AppLink'
import type { WorkspaceContext } from './features'
import workspace from './workspace.module.css'

/**
 * The column beside the chat: the pull request bar, the file lists, and the
 * tools panel below them. A handle on its inner edge resizes it. Without
 * `tools`, the files part fills the column, as for an archived workspace.
 */
export function RightColumn(props: {
  pullRequest: ReactNode
  files: ReactNode
  tools?: ReactNode
}) {
  const width = useStore(usePanelWidths().widths).right
  const aside = useRef<HTMLElement>(null)
  return (
    <aside
      aria-label="Files and tools"
      className={classes(column.column, workspace.right)}
      ref={aside}
      style={width === null ? undefined : { width }}
    >
      <ResizeHandle
        edge="left"
        label="Resize the right column"
        measure={() => aside.current?.clientWidth ?? 0}
        panel="right"
      />
      {props.pullRequest}
      <div className={column.files}>{props.files}</div>
      {props.tools ? <div className={column.tools}>{props.tools}</div> : null}
    </aside>
  )
}

/** What a phone shows: the chat, the files, or one tool. */
export type PhoneView = 'chat' | 'files' | 'terminal' | 'preview' | 'desktop'

const phoneTabs: readonly {
  view: PhoneView
  label: string
  icon: LucideIcon
}[] = [
  { view: 'chat', label: 'Chat', icon: MessageSquare },
  { view: 'files', label: 'Files', icon: Files },
  { view: 'terminal', label: 'Terminal', icon: SquareTerminal },
  { view: 'preview', label: 'Preview', icon: Globe },
  { view: 'desktop', label: 'Desktop', icon: Monitor },
]

/** The view of a phone from the address after the workspace. */
export function phoneView(view: readonly string[]): PhoneView {
  return phoneTabs.find((tab) => tab.view === view[0])?.view ?? 'chat'
}

/** The five tabs at the bottom of a phone. Each tab is a link. */
export function PhoneTabBar(props: { context: WorkspaceContext }) {
  const { org, workspace: open, view } = props.context
  const current = phoneView(view)
  return (
    <nav aria-label="Workspace" className={tabs.bar}>
      {phoneTabs.map((tab) => {
        const selected = tab.view === current
        const Icon = tab.icon
        const path =
          tab.view === 'chat'
            ? routes.workspace(org.id, open.id)
            : routes.workspace(org.id, open.id, tab.view)
        return (
          <AppLink
            aria-current={selected ? 'page' : undefined}
            className={classes(tabs.tab, selected && tabs.selected)}
            key={tab.view}
            to={path}
          >
            <span className={tabs.icon}>
              <Icon size={19} strokeWidth={selected ? 2.2 : 1.8} />
            </span>
            {tab.label}
          </AppLink>
        )
      })}
    </nav>
  )
}

/**
 * The chat column: the history, the start steps at its end, and the
 * composer or the bar of a sandbox that is down. The history keeps the
 * newest lines in view.
 */
export function ChatColumn(props: {
  phone: boolean
  transcript: ReactNode
  starting: ReactNode
  footer: ReactNode
}) {
  return (
    <section
      aria-label="Chat"
      className={classes(chat.chat, props.phone && chat.mobile)}
    >
      <div className={chat.scroll}>
        <div className={chat.transcript}>
          {props.transcript}
          {props.starting}
        </div>
      </div>
      <div className={chat.footer}>{props.footer}</div>
    </section>
  )
}
