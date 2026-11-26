import type { RunnerChangeModel } from '../../src/shared/generated/RunnerChangeModel'
import type { RunnerInterrupt } from '../../src/shared/generated/RunnerInterrupt'
import type { RunnerNotice } from '../../src/shared/generated/RunnerNotice'
import type { StoredAttachment } from './types'

/** Credentials enter only the live command, after this record is read. */
export type PendingCommand =
  | {
      type: 'turn' | 'message'
      commandId: string
      sessionId: string
      turnId: string
      messageId: string
      sessionWatchId?: string
      attachments: readonly StoredAttachment[]
    }
  | RunnerInterrupt
  | RunnerChangeModel
  /** A notice keeps only note IDs. Dispatch reads the words from history. */
  | (Omit<RunnerNotice, 'notices'> & { noticeIds: readonly string[] })
