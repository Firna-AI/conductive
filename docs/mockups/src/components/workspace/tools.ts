import type { LucideIcon } from 'lucide-react'
import { Files, Globe, MessageSquare, SquareTerminal } from 'lucide-react'
import { paths } from '../../paths'

/**
 * The tools that the tools panel can show. The app hides Desktop and keeps
 * its view for its return. No tab offers Desktop, and only the catalogue
 * page `app/tools/desktop` draws it.
 */
export const toolKeys = ['terminal', 'preview', 'desktop'] as const

export type ToolKey = (typeof toolKeys)[number]

/** What a phone shows: the chat, the files, or one tool. */
export type MobileTabKey = 'chat' | 'files' | ToolKey

export type ToolTab = {
  key: ToolKey
  label: string
  icon: LucideIcon
  to: string
}

export type MobileTab = {
  key: MobileTabKey
  label: string
  icon: LucideIcon
  to: string
}

/** The tabs of the tools that the app offers: Terminal and Preview. */
export const toolTabs: readonly ToolTab[] = [
  {
    key: 'terminal',
    label: 'Terminal',
    icon: SquareTerminal,
    to: paths.terminal,
  },
  { key: 'preview', label: 'Preview', icon: Globe, to: paths.preview },
]

export const mobileTabs: readonly MobileTab[] = [
  { key: 'chat', label: 'Chat', icon: MessageSquare, to: paths.chat },
  { key: 'files', label: 'Files', icon: Files, to: paths.filesAll },
  ...toolTabs,
]
