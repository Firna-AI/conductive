import type { WorkspaceState } from '../../src/shared/workspaces'
import type { HttpFetch } from '../env'

export interface ProxySocket {
  accept(): void
  send(data: string | ArrayBuffer): void
  close(code?: number, reason?: string): void
  addEventListener(
    type: 'message',
    listener: (event: { data: string | ArrayBuffer }) => void,
  ): void
  addEventListener(type: 'close' | 'error', listener: () => void): void
}

export interface SocketRuntime {
  pair(): { server: ProxySocket; response(headers: Headers): Response }
}

export interface ToolDependencies {
  fetch: HttpFetch
  now: () => number
  sockets?: SocketRuntime
  onActivity?: (
    workspaceId: string,
    source: 'terminal' | 'preview',
  ) => Promise<void>
}

export interface WorkspaceTarget {
  orgId: string
  workspaceId: string
  sandboxId: string | null
  state: WorkspaceState
}
