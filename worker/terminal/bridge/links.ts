import type { BridgeSize } from '../../../src/shared/terminal-bridge.ts'

/** The tmux client in control mode, as the bridge uses it. */
export interface TmuxLink {
  /** Writes one command line. */
  send(line: string): void
  close(): void
}

/** The terminal device of the connection, and the rest of the process. */
export interface DeviceLink {
  write(bytes: Uint8Array | string): void
  size(): BridgeSize
  /** Writes a private file for a paste and returns its path. */
  writePaste(bytes: Uint8Array): string
  removePaste(path: string): void
  schedule(task: () => void, milliseconds: number): () => void
  exit(code: number): void
}

/** The exit code that makes the launcher run the plain tmux client. */
export const EXIT_BEFORE_HELLO = 3
