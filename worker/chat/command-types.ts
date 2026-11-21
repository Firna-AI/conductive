import type { RunnerAttachment } from '../../src/shared/generated/RunnerAttachment'
import type { RunnerChangeModel } from '../../src/shared/generated/RunnerChangeModel'
import type { RunnerCommand } from '../../src/shared/generated/RunnerCommand'
import type { RunnerInterrupt } from '../../src/shared/generated/RunnerInterrupt'
import type { RunnerNotice } from '../../src/shared/generated/RunnerNotice'
import type { StoredAttachment } from './types'
import type { AgentLogin } from './login-kind'

export type PreparedMessageCommand = (
  | Omit<Extract<RunnerCommand, { type: 'turn' }>, 'attachments' | 'credential'>
  | Omit<Extract<RunnerCommand, { type: 'message' }>, 'attachments'>
) & { attachments: readonly StoredAttachment[]; login: AgentLogin }

export type PreparedCommand =
  PreparedMessageCommand | RunnerInterrupt | RunnerChangeModel | RunnerNotice

/** Credentials enter only the live command, after this record is read. */
export type PendingCommand =
  | {
      type: 'turn' | 'message'
      commandId: string
      sessionId: string
      turnId: string
      messageId: string
      attachments: readonly StoredAttachment[]
    }
  | RunnerInterrupt
  | RunnerChangeModel
  | (Omit<RunnerNotice, 'notices'> & { noticeIds: readonly string[] })

type ResolveCommand<Command> = Command extends PreparedMessageCommand
  ? Omit<Command, 'attachments'> & { attachments: readonly RunnerAttachment[] }
  : Command

export type ResolvedCommand = ResolveCommand<PreparedCommand>
