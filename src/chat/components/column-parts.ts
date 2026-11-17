import type { SessionChatProps } from './SessionChat'
import type { SessionTabsProps } from './SessionTabs'

/** The props that every tab row of the column shares. */
export type RowProps = Omit<
  SessionTabsProps,
  'tabs' | 'label' | 'focus' | 'history' | 'onNew' | 'drag' | 'paneItem'
>

/** The props that every session chat of the column shares. */
export type ChatProps = Omit<
  SessionChatProps,
  'sessionId' | 'lead' | 'barBelow' | 'composerFocus'
>

/** The names of a pane of a split and of its row for a screen reader. */
export const paneNames = {
  0: { pane: 'Left pane', row: 'Sessions and files of the left pane' },
  1: { pane: 'Right pane', row: 'Sessions and files of the right pane' },
} as const
