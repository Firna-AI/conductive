import { listConversationKeys } from './listConversations'
import { tableConversationKeys } from './tableConversations'

/** The key of each chat that the mockups draw. */
export const conversationKeys = [
  'history',
  'running',
  'steer',
  'interrupted',
  'sandbox-stopped',
  'failed',
  'queued',
  'queued-follow-up',
  'queued-retry',
  'first-turn',
  'mac-waiting',
  'mac-waiting-many',
  'mac-waiting-suite',
  'mac-denied',
  'mac-done',
  'mac-unavailable',
  'output-left-out',
  'output-left-out-running',
  'files-left-out',
  'lost-lines',
  'lost-turn-end',
  'files-unavailable',
  'stopped-files-unavailable',
  'linked',
  'sent-files',
  'queued-files',
  'link-sent',
  'link-answer',
  'other-org-link',
  'steered',
  'mac-in-work',
  ...tableConversationKeys,
  ...listConversationKeys,
] as const

export type ConversationKey = (typeof conversationKeys)[number]
