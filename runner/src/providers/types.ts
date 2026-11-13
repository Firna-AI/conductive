import type { AgentChoice } from '../../../src/shared/generated/AgentChoice'
import type { ToolCall } from '../../../src/shared/generated/ToolCall'
import type { TurnEndReason } from '../../../src/shared/generated/TurnEndReason'
import type { CommitAuthor } from '../../../src/shared/generated/CommitAuthor'
import type { RunnerLogin } from '../../../src/shared/generated/RunnerLogin'
import type { RunnerTurnCredential } from '../../../src/shared/generated/RunnerTurnCredential'
import type { RunnerMessageDuringTurn } from '../../../src/shared/generated/RunnerMessageDuringTurn'
import type { RunnerTurn } from '../../../src/shared/generated/RunnerTurn'
import type { RunnerBranches } from '../../../src/shared/generated/RunnerBranches'
import type { ProviderLifetime } from './lifetime'
import type { WorkspaceToolContext } from './workspace-tools'

export type ProviderInput = RunnerTurn | RunnerMessageDuringTurn
export type ProviderEvent =
  | { type: 'conversation'; id: string }
  | { type: 'thinking' }
  | { type: 'delta'; messageId: string; text: string }
  | {
      type: 'answer'
      messageId: string
      text: string
      userMessageIds: readonly string[]
    }
  | { type: 'tool'; tool: ToolCall }
  | { type: 'background'; live: boolean; idle: boolean }
  | { type: 'activity'; idle: boolean }
  | { type: 'wake-up'; state: 'finished' | 'stopped' }
  | {
      type: 'result'
      state: 'finished' | 'stopped'
      userMessageIds: readonly string[]
      endReason?: TurnEndReason
    }
  | { type: 'failed'; code: string; message: string }

export interface ProviderProcess {
  send(input: ProviderInput): Promise<void>
  /** A deferred choice needs a new provider turn at the next safe boundary. */
  model(choice: AgentChoice): Promise<'applied' | 'deferred'>
  interrupt(): Promise<void>
  /** Ends the visible turn and all provider input still waiting to run. */
  stop(): Promise<void>
  close(): Promise<void>
}

export interface ProviderOptions {
  cwd: string
  home: string
  sessionId: string
  endpoint: string
  credential:
    | ({ type: 'gateway' } & RunnerTurnCredential)
    | { type: 'native'; login: RunnerLogin }
  commitAuthor: CommitAuthor | null
  choice: AgentChoice
  conversationId: string | null
  instructions: string
  instructionBranches?: RunnerBranches | null
  tools: WorkspaceToolContext
  event: (event: ProviderEvent) => void
  warn: (message: string) => void
  signal?: AbortSignal
  lifetime?: ProviderLifetime
  /** Work already named by the Stop hook of this turn, across process handoffs. */
  backgroundNoteIds?: Set<string>
}

export type ProviderFactory = (
  options: ProviderOptions,
) => Promise<ProviderProcess>
