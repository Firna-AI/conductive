import { workspacePath } from './workspaces'

export const TERMINAL_PORT = 7681

export const terminalPaths = {
  connection: (orgId: string, id: string) =>
    `${workspacePath(orgId, id)}/terminal`,
  socket: (orgId: string, id: string) =>
    `${workspacePath(orgId, id)}/terminal/socket`,
} as const

/** The socket proxies ttyd's binary protocol. No password reaches the browser. */
export type TerminalResponse =
  | { state: 'ready'; socketPath: string; protocol: 'tty' }
  | { state: 'starting' | 'stopped'; socketPath: null }

/**
 * How a terminal connection ended. `closed`: the server or the screen closed
 * the connection, such as when the shell exits, or the connection could not
 * start. `lost`: the connection dropped with no close of the server, such as
 * at a restart of the server or a failed network.
 */
export type TerminalEnd = 'closed' | 'lost'

/** The screen uses this adapter after ttyd framing has been decoded. */
export interface TerminalTransport {
  write(input: string): void
  resize(columns: number, rows: number): void
  onData(listener: (output: string) => void): () => void
  onClose(listener: (end: TerminalEnd) => void): () => void
  close(): void
}
