import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import type { AppEnv } from '../env'
import type { DurableLifecycle } from './durable'
import type { WorkspaceEventJournal } from './durable-journal'
import {
  nativeWorkspaceStorage,
  type WorkspaceStorage,
} from './platform-storage'
import {
  broadcastWorkspaceEvent,
  handleWorkspaceSocket,
} from './workspace-sockets'

export interface WorkspacePlatform {
  storage: WorkspaceStorage
  blockConcurrencyWhile<T>(operation: () => Promise<T>): Promise<T>
  waitUntil(promise: Promise<unknown>): void
  publish(event: WorkspaceEventEnvelope): Promise<void>
  openSocket(
    request: Request,
    lifecycle: DurableLifecycle,
    journal: WorkspaceEventJournal,
  ): Promise<Response>
}

export function nativeWorkspacePlatform(
  ctx: DurableObjectState,
  env: AppEnv,
): WorkspacePlatform {
  return {
    storage: nativeWorkspaceStorage(ctx.storage),
    blockConcurrencyWhile: (operation) => ctx.blockConcurrencyWhile(operation),
    waitUntil: (promise) => ctx.waitUntil(promise),
    publish: (event) => broadcastWorkspaceEvent(env, ctx, event),
    openSocket: (request, lifecycle, journal) =>
      handleWorkspaceSocket(request, env, ctx, lifecycle, journal),
  }
}
