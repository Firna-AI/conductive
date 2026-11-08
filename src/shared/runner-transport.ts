import type { RunnerToWorkspace, WorkspaceToRunner } from './runner'

/** An adapter can use a native WebSocket, Node, or the in-memory test endpoint. */
export interface RunnerConnection {
  send(message: RunnerToWorkspace): void
  onMessage(listener: (message: WorkspaceToRunner) => void): () => void
  onClose(listener: () => void): () => void
  close(): void
}

export interface RunnerConnectionRequest {
  url: string
  workspaceToken: string
}

export type RunnerConnector = (
  request: RunnerConnectionRequest,
) => RunnerConnection | Promise<RunnerConnection>
