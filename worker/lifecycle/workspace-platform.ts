import type { WorkspaceEvent } from '../../src/shared/events'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import {
  nativeWorkspaceStorage,
  type WorkspaceStorage,
} from './platform-storage'

export interface WorkspaceEventPublication {
  workspaceId: string
  event: WorkspaceEvent
  occurredAt: number
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
}

export function nativeWorkspacePlatform(
  ctx: DurableObjectState,
  publish: WorkspacePlatform['publish'],
  storage = nativeWorkspaceStorage(ctx.storage),
): WorkspacePlatform {
  return {
    storage,
    blockConcurrencyWhile: (operation) => ctx.blockConcurrencyWhile(operation),
    waitUntil: (promise) => ctx.waitUntil(promise),
    publish,
  }
}
