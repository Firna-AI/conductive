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

/** The screen uses this adapter after ttyd framing has been decoded. */
export interface TerminalTransport {
  write(input: string): void
  resize(columns: number, rows: number): void
  onData(listener: (output: string) => void): () => void
  onClose(listener: () => void): () => void
  close(): void
}
