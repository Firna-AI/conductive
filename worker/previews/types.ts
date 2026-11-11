import type { WorkspaceState } from '../../src/shared/workspaces'
import type { HttpFetch } from '../env'
import type { ConnectionScheduler } from '../security/connection-access'
import type { WorkerErrorRuntime } from '../error-reporting/runtime'
import type { WorkspaceErrorReporting } from '../error-reporting/workspace'

export interface ProxySocket {
  binaryType: 'blob' | 'arraybuffer'
  accept(): void
  send(data: string | ArrayBuffer): void
  close(code?: number, reason?: string): void
  addEventListener(
    type: 'message' | 'close' | 'error',
    listener: (event: unknown) => void,
  ): void
}

export interface SocketRuntime {
  pair(): { server: ProxySocket; response(headers: Headers): Response }
}

export interface ToolDependencies {
  errorReporting?: WorkerErrorRuntime
  reporting?: WorkspaceErrorReporting
  terminalSchedule?: ConnectionScheduler
  fetch: HttpFetch
  now: () => number
  sockets?: SocketRuntime
  onActivity?: (workspaceId: string, at: number) => void
}

export interface WorkspaceTarget {
  orgId: string
  workspaceId: string
  sandboxId: string | null
  providerAccount: string
  state: WorkspaceState
}
