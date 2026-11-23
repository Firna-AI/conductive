import type { RunnerChangeModel } from '../../src/shared/generated/RunnerChangeModel'
import type { RunnerInterrupt } from '../../src/shared/generated/RunnerInterrupt'
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
      scheduledWakeUpId?: string
      wakeUp?: true
      attachments: readonly StoredAttachment[]
    }
  | RunnerInterrupt
  | RunnerChangeModel
