import type { HttpFetch } from '../../env'
import type {
  CommandOffsets,
  PortMode,
  SandboxProvider,
  SandboxStart,
  ProviderAllocationMode,
} from '../provider'
import { ProviderError } from '../errors'
import type { E2bContext } from './context'
import { E2bControl } from './control'
import {
  deleteSandbox,
  getSandbox,
  resumeSandbox,
  setTimeout,
  stopSandbox,
} from './lifecycle'
import { deleteSnapshot, getSnapshot, saveSnapshot } from './snapshots'
import { runSupervised, startCommand, getCommandStatus } from './commands'
import { writeEnvironment } from './environment'
import { readFile, writeFile } from './files'
import { privatePort } from './ports'
import { createSandbox } from './allocation'
import { cleanupAllocation } from './allocation-cleanup'

export interface E2bClientOptions {
  accountId: string
  apiKey: string
  domain: string
  templateId: string
  db: D1Database
  encryptionKey: string
  fetch: HttpFetch
  allocationMode?: ProviderAllocationMode
}

export class E2bClient implements SandboxProvider {
  private readonly context: E2bContext

  constructor(options: E2bClientOptions) {
    this.context = {
      ...options,
      allocationMode: options.allocationMode ?? 'active',
      control: new E2bControl(options.apiKey, options.domain, options.fetch),
    }
  }

  private requireActive(): void {
    if (this.context.allocationMode === 'cleanup') unsupported()
  }

  async create(input: SandboxStart) {
    if (this.context.allocationMode === 'cleanup')
      return cleanupAllocation(this.context, input.idempotencyKey)
    const sandbox = await createSandbox(this.context, input)
    if (sandbox.state === 'ready')
      await writeEnvironment(this.context, sandbox.id, input.env ?? {})
    return sandbox
  }

  get(sandboxId: string) {
    return getSandbox(this.context, sandboxId)
  }

  async stop(sandboxId: string) {
    this.requireActive()
    return stopSandbox(this.context, sandboxId)
  }

  async resume(id: string, env: Record<string, string>, ttl: number) {
    this.requireActive()
    const sandbox = await resumeSandbox(this.context, id, ttl)
    await writeEnvironment(this.context, id, env)
    return sandbox
  }

  delete(sandboxId: string) {
    return deleteSandbox(this.context, sandboxId)
  }

  async setAutoStop(sandboxId: string, ttl: number) {
    this.requireActive()
    return setTimeout(this.context, sandboxId, ttl)
  }

  async saveSnapshot(id: string, name: string) {
    this.requireActive()
    return saveSnapshot(this.context, id, name)
  }

  getSnapshot(name: string) {
    return getSnapshot(this.context, name)
  }

  deleteSnapshot(name: string) {
    return deleteSnapshot(this.context, name)
  }

  async privatePort(sandboxId: string, port: number, mode: PortMode) {
    this.requireActive()
    return privatePort(this.context, sandboxId, port, mode)
  }
  desktop: SandboxProvider['desktop'] = async () => unsupported()
  fork: SandboxProvider['fork'] = async () => unsupported()
  async readFile(sandboxId: string, path: string, maxBytes: number) {
    this.requireActive()
    return readFile(this.context, sandboxId, path, maxBytes)
  }
  async writeFile(
    sandboxId: string,
    path: string,
    body: ReadableStream<Uint8Array>,
    sizeBytes: number,
  ) {
    this.requireActive()
    return writeFile(this.context, sandboxId, path, body, sizeBytes)
  }
  async runCommand(sandboxId: string, command: string) {
    this.requireActive()
    return runSupervised(this.context, sandboxId, command)
  }
  async startCommand(sandboxId: string, command: string) {
    this.requireActive()
    return startCommand(this.context, sandboxId, command)
  }
  async getCommandStatus(
    sandboxId: string,
    processId: number,
    offsets: CommandOffsets,
  ) {
    this.requireActive()
    return getCommandStatus(this.context, sandboxId, processId, offsets)
  }
}

function unsupported(): never {
  throw new ProviderError('unavailable', 501, 'unsupported_operation')
}
