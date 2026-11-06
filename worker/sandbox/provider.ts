export interface BoatAccount {
  id: string
  type: 'personal' | 'org'
}

export const SANDBOX_STATES = [
  'init',
  'provisioning',
  'provisioned',
  'cloning',
  'ready',
  'idle',
  'running',
  'archiving',
  'archived',
  'error',
  'cancelled',
] as const

export type SandboxState = (typeof SANDBOX_STATES)[number]

export interface Sandbox {
  id: string
  state: SandboxState
}

export interface SandboxStart {
  name?: string
  snapshotName?: string
  env?: Record<string, string>
  labels?: Record<string, string>
  ttlSeconds: number
  idempotencyKey: string
}

export interface SavedSnapshot {
  name: string
  sourceSandboxId: string
  status: 'saving' | 'ready' | 'failed'
}

export interface CommandResult {
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
}

export interface StartedCommand {
  processId: number
}

/** Persist these provider byte offsets, rather than counting output characters. */
export interface CommandOffsets {
  stdoutOffset: number
  stderrOffset: number
}

export interface CommandStatus extends CommandOffsets {
  processId: number
  state: 'running' | 'exited' | 'lost'
  running: boolean
  exitCode: number | null
  /** Null when the provider does not report a timeout outcome. */
  timedOut: boolean | null
  stdout: string
  stderr: string
  stdoutNextOffset: number
  stderrNextOffset: number
  more: boolean
}

export interface SandboxFile {
  path: string
  sizeBytes: number
  encoding: 'utf-8' | 'base64'
  content: string
}

export type SandboxFileRead =
  | { kind: 'file'; file: SandboxFile }
  | { kind: 'too_large'; sizeBytes: number; limitBytes: number }

export type PortMode = 'localhost' | 'network'
export interface PrivatePort {
  origin: string
  token: string
}
export type SandboxDesktop =
  { kind: 'ready'; url: string } | { kind: 'starting' }

/** Internal server interface. Callers must authorize the org and its resource first. */
export interface SandboxProvider {
  privatePort(
    sandboxId: string,
    port: number,
    mode: PortMode,
  ): Promise<PrivatePort>
  desktop(sandboxId: string): Promise<SandboxDesktop>
  readFile(
    sandboxId: string,
    path: string,
    maxBytes: number,
  ): Promise<SandboxFileRead>
  create(input: SandboxStart): Promise<Sandbox>
  get(sandboxId: string): Promise<Sandbox>
  stop(sandboxId: string): Promise<Sandbox>
  resume(
    sandboxId: string,
    env: Record<string, string>,
    ttlSeconds: number,
  ): Promise<Sandbox>
  fork(sandboxId: string, input: SandboxStart): Promise<Sandbox>
  delete(sandboxId: string): Promise<void>
  setAutoStop(sandboxId: string, ttlSeconds: number): Promise<Sandbox>
  saveSnapshot(sandboxId: string, name: string): Promise<SavedSnapshot>
  getSnapshot(name: string): Promise<SavedSnapshot>
  deleteSnapshot(name: string): Promise<void>
  runCommand(sandboxId: string, command: string): Promise<CommandResult>
  startCommand(sandboxId: string, command: string): Promise<StartedCommand>
  getCommandStatus(
    sandboxId: string,
    processId: number,
    offsets: CommandOffsets,
  ): Promise<CommandStatus>
}
