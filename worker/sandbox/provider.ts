import type {
  CommandOffsets,
  CommandResult,
  CommandStatus,
} from '../machines/channel'

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
export type ProviderAllocationMode = 'active' | 'cleanup'

export interface Sandbox {
  id: string
  state: SandboxState
  hydrated?: boolean
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

export interface StartedCommand {
  processId: number
}

interface SandboxFile {
  path: string
  sizeBytes: number
  encoding: 'utf-8' | 'base64'
  content: string
}

export type SandboxFileRead =
  | { kind: 'file'; file: SandboxFile }
  | { kind: 'too_large'; sizeBytes: number; limitBytes: number }

export interface SandboxFileInfo {
  path: string
  sizeBytes: number
  isDirectory: boolean
}

export type PortMode = 'localhost' | 'network'
export interface PortCredential {
  readonly headers: Readonly<Record<string, string>>
  readonly stripCookies: readonly string[]
  readonly stripHeaders: readonly string[]
  readonly stripQueryParameters: readonly string[]
}

export interface PrivatePort {
  origin: string
  credential: PortCredential
}
export type SandboxDesktop =
  { kind: 'ready'; url: string } | { kind: 'starting' }

/** Callers authorize the org and its resource before using the provider. */
export interface MachineProvider {
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
  desktop(sandboxId: string): Promise<SandboxDesktop>
}

/** The provider path for work on a computer. A computer without a host connection can use it. */
export interface ProviderWork {
  runCommand(sandboxId: string, command: string): Promise<CommandResult>
  startCommand(sandboxId: string, command: string): Promise<StartedCommand>
  getCommandStatus(
    sandboxId: string,
    processId: number,
    offsets: CommandOffsets,
  ): Promise<CommandStatus>
  fileInfo(sandboxId: string, path: string): Promise<SandboxFileInfo>
  readFile(
    sandboxId: string,
    path: string,
    maxBytes: number,
  ): Promise<SandboxFileRead>
  privatePort(
    sandboxId: string,
    port: number,
    mode: PortMode,
  ): Promise<PrivatePort>
}

/** A provider client that also supplies the provider path for work. */
export type SandboxProvider = MachineProvider & ProviderWork
