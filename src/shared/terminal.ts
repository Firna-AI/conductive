import { workspacePath } from './workspaces'

export const TERMINAL_PORT = 7681
export const TERMINAL_LIMIT = 10
export const FIRST_TERMINAL_ID = 'workspace'
export const TERMINAL_ID_PATTERN = '[a-f0-9]{32}'

/** Later terminals use 128 random bits, encoded as lowercase hexadecimal. */
function isAdditionalTerminalId(value: string): boolean {
  return (
    value.length === 32 && new RegExp(`^${TERMINAL_ID_PATTERN}$`).test(value)
  )
}

export function isTerminalId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (value === FIRST_TERMINAL_ID || isAdditionalTerminalId(value))
  )
}

export const terminalPaths = {
  connection: (orgId: string, id: string) =>
    `${workspacePath(orgId, id)}/terminal`,
  socket: (orgId: string, id: string) =>
    `${workspacePath(orgId, id)}/terminal/socket`,
  terminals: (orgId: string, id: string) =>
    `${workspacePath(orgId, id)}/terminal/terminals`,
  terminal: (orgId: string, id: string, terminalId: string) =>
    `${workspacePath(orgId, id)}/terminal/terminals/${encodeURIComponent(terminalId)}`,
  terminalSocket: (orgId: string, id: string, terminalId: string) =>
    `${workspacePath(orgId, id)}/terminal/terminals/${encodeURIComponent(terminalId)}/socket`,
} as const

export interface TerminalEntry {
  id: string
  number: number
  socketPath: string
}

export interface TerminalListResponse {
  terminals: readonly TerminalEntry[]
  /** Older response readers can omit this. The Worker always sends it. */
  eventNumber?: number
}

export interface CreateTerminalResponse extends TerminalListResponse {
  terminal: TerminalEntry
}

/** The socket proxies ttyd's binary protocol. No password reaches the browser. */
export type TerminalResponse = {
  /** Older response readers can omit these fields. The Worker always sends them. */
  terminals?: readonly TerminalEntry[]
  several?: boolean
  eventNumber?: number
} & (
  | { state: 'ready'; socketPath: string; protocol: 'tty' }
  | { state: 'starting' | 'stopped'; socketPath: null }
)

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
