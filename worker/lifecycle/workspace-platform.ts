import type { WorkspaceEvent } from '../chat/workspace-events'
import type {
  PendingTurn,
  WorkspaceLifecycleEndpoint,
} from './workspace-runtime'
import type { WorkspaceStorage } from './platform-storage'
import type { RunnerImportCommand } from '../../src/shared/runner-import'
import type { SeedImportSession } from '../chat/import-sessions'

export interface WorkspaceEventPublication {
  workspaceId: string
  event: WorkspaceEvent
  occurredAt: number
}

interface WorkspaceChatRecovery {
  runningTurns: readonly PendingTurn[]
  lastTurnEndedAt: number | null
  title: { name: string; occurredAt: number } | null
}

export interface WorkspacePlatform {
  storage: WorkspaceStorage
  blockConcurrencyWhile<T>(operation: () => Promise<T>): Promise<T>
  waitUntil(promise: Promise<unknown>): void
  publish(event: WorkspaceEventPublication): Promise<void>
  admitFirstMessage?(
    input: Parameters<WorkspaceLifecycleEndpoint['initializeLifecycle']>[0],
  ): Promise<void>
  stopped?(workspaceId: string): Promise<void>
  stopping?(workspaceId: string): Promise<void>
  deviceWaiting?(workspaceId: string): Promise<boolean>
  readChatRecovery?(workspaceId: string): Promise<WorkspaceChatRecovery>
  chatRecovered?(): void
  sendImportCommand?(
    workspaceId: string,
    command: Omit<RunnerImportCommand, 'connectionId'>,
  ): Promise<string | null>
  seedImportSession?(
    workspaceId: string,
    input: SeedImportSession,
  ): Promise<unknown>
}

export function nativeWorkspacePlatform(
  ctx: Pick<DurableObjectState, 'blockConcurrencyWhile' | 'waitUntil'>,
  publish: WorkspacePlatform['publish'],
  storage: WorkspaceStorage,
): WorkspacePlatform {
  return {
    storage,
    blockConcurrencyWhile: async (operation) => {
      const result = await ctx.blockConcurrencyWhile(async () => {
        try {
          return { ok: true as const, value: await operation() }
        } catch (error) {
          return { ok: false as const, error }
        }
      })
      if (!result.ok) throw result.error
      return result.value
    },
    waitUntil: (promise) => ctx.waitUntil(promise),
    publish,
  }
}
