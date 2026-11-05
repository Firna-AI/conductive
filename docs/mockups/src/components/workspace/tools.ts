import type { LucideIcon } from 'lucide-react'
import {
  Files,
  Globe,
  MessageSquare,
  Monitor,
  SquareTerminal,
} from 'lucide-react'
import { paths } from '../../paths'

export const toolKeys = ['files', 'terminal', 'preview', 'desktop'] as const

export type ToolKey = (typeof toolKeys)[number]

export type WorkspaceTab = {
  key: ToolKey | 'chat'
  label: string
  icon: LucideIcon
  to: string
}

export const chatTab: WorkspaceTab = {
  key: 'chat',
  label: 'Chat',
  icon: MessageSquare,
  to: paths.chat,
}

export const toolTabs: readonly WorkspaceTab[] = [
  { key: 'files', label: 'Files', icon: Files, to: paths.filesAll },
  {
    key: 'terminal',
    label: 'Terminal',
    icon: SquareTerminal,
    to: paths.terminal,
  },
  { key: 'preview', label: 'Preview', icon: Globe, to: paths.preview },
  { key: 'desktop', label: 'Desktop', icon: Monitor, to: paths.desktop },
]
