import type { AgentChoice } from '../../../src/shared/agents'
import type { ToolCall } from '../../../src/shared/chat-events'
import type { CommitAuthor } from '../../../src/shared/commit-author'
import type {
  RunnerLogin,
  RunnerTurnCredential,
  RunnerMessageDuringTurnV2 as RunnerMessageDuringTurn,
  RunnerTurnV2 as RunnerTurn,
  RunnerBranches,
} from '../../../src/shared/runner'
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
  | {
      type: 'result'
      state: 'finished' | 'stopped'
      userMessageIds: readonly string[]
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
}

export type ProviderFactory = (
  options: ProviderOptions,
) => Promise<ProviderProcess>
