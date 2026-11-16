import { workspacePath } from './workspaces'

export const TERMINAL_PORT = 7681
export const FIRST_TERMINAL_ID = 'workspace'
export const TERMINAL_ID_PATTERN = '[a-f0-9]{32}'

/** Later terminals use 128 random bits, encoded as lowercase hexadecimal. */
export function isAdditionalTerminalId(value: string): boolean {
  return (
    value.length === 32 && new RegExp(`^${TERMINAL_ID_PATTERN}$`).test(value)
  )
}

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
