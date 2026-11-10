import type { RunnerToWorkspace, WorkspaceToRunner } from './runner'

/** An adapter can use a native WebSocket, Node, or the in-memory test endpoint. */
export interface RunnerConnection<
  Message extends WorkspaceToRunner = WorkspaceToRunner,
> {
  send(message: RunnerToWorkspace): void
  onMessage(listener: (message: Message) => void): () => void
  onClose(listener: () => void): () => void
  close(): void
}

export interface RunnerConnectionRequest {
  url: string
  workspaceToken: string
}

export type RunnerConnector<
  Message extends WorkspaceToRunner = WorkspaceToRunner,
> = (
  request: RunnerConnectionRequest,
) => RunnerConnection<Message> | Promise<RunnerConnection<Message>>
