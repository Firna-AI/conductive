import type { WorkspaceEvent } from '../../src/shared/events'
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
}

export function nativeWorkspacePlatform(
  ctx: DurableObjectState,
  publish: WorkspacePlatform['publish'],
): WorkspacePlatform {
  return {
    storage: nativeWorkspaceStorage(ctx.storage),
    blockConcurrencyWhile: (operation) => ctx.blockConcurrencyWhile(operation),
    waitUntil: (promise) => ctx.waitUntil(promise),
    publish,
  }
}
