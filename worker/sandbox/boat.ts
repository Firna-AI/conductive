import type { HttpFetch } from '../env'
import { ProviderError } from './errors'
import { readSandboxFile } from './file-read'
import {
  readAccount,
  readCommand,
  readCommandStatus,
  readSandbox,
  readSnapshot,
  readStartedCommand,
} from './parsers'
import type {
  BoatAccount,
  CommandOffsets,
  CommandStatus,
  PrivatePort,
  PortMode,
  SandboxDesktop,
  SandboxProvider,
  SandboxStart,
  StartedCommand,
} from './provider'
import { BoatTransport } from './transport'

export class BoatClient implements SandboxProvider {
  private readonly transport: BoatTransport

  constructor(key: string, fetch: HttpFetch, account: BoatAccount) {
    this.transport = new BoatTransport(key, fetch, account)
  }

  readFile(sandboxId: string, path: string, maxBytes: number) {
    return readSandboxFile(this.transport, sandboxId, path, maxBytes)
  }

  async privatePort(
    sandboxId: string,
    port: number,
    mode: PortMode,
  ): Promise<PrivatePort> {
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new ProviderError('invalid_request', 400)
    const value = await this.transport.request(
      { operation: 'host', sandboxId },
      {
        port,
        public: false,
        localhost: mode === 'localhost',
      },
    )
    if (
      value.type !== 'port.hosted' ||
      value.port !== port ||
      value.access !== 'private' ||
      value.isProtected !== true ||
      typeof value.url !== 'string'
    ) {
      throw new ProviderError('invalid_response', 502)
    }
    let url: URL
    try {
      url = new URL(value.url)
    } catch {
      throw new ProviderError('invalid_response', 502)
    }
    const token = url.searchParams.get('_token')
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !new RegExp(`^[a-z0-9-]+-${port}\\.on\\.boat\\.dev$`).test(
        url.hostname,
      ) ||
      url.pathname !== '/' ||
      url.hash ||
      url.searchParams.getAll('_token').length !== 1 ||
      !token ||
      !/^[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]+$/.test(token)
    ) {
      throw new ProviderError('invalid_response', 502)
    }
    return { origin: url.origin, token }
  }

  async desktop(sandboxId: string): Promise<SandboxDesktop> {
    const value = await this.transport.request(
      { operation: 'desktop', sandboxId },
      {},
    )
    if (value.type === 'desktop.provisioning' && value.provisioning === true) {
      return { kind: 'starting' }
    }
    if (value.type !== 'desktop.url' || typeof value.desktopUrl !== 'string')
      throw new ProviderError('invalid_response', 502)
    let url: URL
    try {
      url = new URL(value.desktopUrl)
    } catch {
      throw new ProviderError('invalid_response', 502)
    }
    const fragment = new URLSearchParams(url.hash.slice(1))
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.searchParams.has('_token') ||
      url.searchParams.has('token') ||
      !fragment.get('token')
    )
      throw new ProviderError('invalid_response', 502)
    return { kind: 'ready', url: url.href }
  }

  static async inspectAccount(
    key: string,
    fetch: HttpFetch,
    expected?: BoatAccount,
  ) {
    const transport = new BoatTransport(key, fetch)
    return readAccount(
      await transport.request({ operation: 'account' }),
      expected,
    )
  }

  async create(input: SandboxStart) {
    return readSandbox(
      await this.transport.request(
        { operation: 'create' },
        {
          name: input.name,
          from: input.snapshotName,
          type: 'default',
          noEnv: true,
          env: input.env ?? {},
          labels: input.labels,
          ttlSeconds: input.ttlSeconds,
        },
        input.idempotencyKey,
      ),
    )
  }

  async get(sandboxId: string) {
    return readSandbox(
      await this.transport.request({ operation: 'get', sandboxId }),
    )
  }

  async stop(sandboxId: string) {
    return readSandbox(
      await this.transport.request({ operation: 'stop', sandboxId }, {}),
    )
  }

  async resume(
    sandboxId: string,
    env: Record<string, string>,
    ttlSeconds: number,
  ) {
    return readSandbox(
      await this.transport.request(
        { operation: 'resume', sandboxId },
        { noEnv: true, env, ttlSeconds },
      ),
    )
  }

  async fork(sandboxId: string, input: SandboxStart) {
    return readSandbox(
      await this.transport.request(
        { operation: 'fork', sandboxId },
        {
          name: input.name,
          type: 'default',
          noEnv: true,
          env: input.env ?? {},
          labels: input.labels,
          ttlSeconds: input.ttlSeconds,
        },
        input.idempotencyKey,
      ),
    )
  }

  async delete(sandboxId: string): Promise<void> {
    await this.transport.request({ operation: 'delete', sandboxId })
  }

  async setAutoStop(sandboxId: string, ttlSeconds: number) {
    return readSandbox(
      await this.transport.request(
        { operation: 'update', sandboxId },
        { ttlSeconds },
      ),
    )
  }

  async saveSnapshot(sandboxId: string, name: string) {
    return readSnapshot(
      await this.transport.request(
        { operation: 'saveSnapshot' },
        { sandboxId, name },
      ),
    )
  }

  async getSnapshot(name: string) {
    return readSnapshot(
      await this.transport.request({ operation: 'getSnapshot', name }),
    )
  }

  async deleteSnapshot(name: string): Promise<void> {
    await this.transport.request({ operation: 'deleteSnapshot', name })
  }

  async runCommand(sandboxId: string, command: string) {
    return readCommand(
      await this.transport.request(
        { operation: 'command', sandboxId },
        { command, timeoutSeconds: 600 },
      ),
    )
  }

  async startCommand(
    sandboxId: string,
    command: string,
  ): Promise<StartedCommand> {
    return readStartedCommand(
      await this.transport.request(
        { operation: 'startCommand', sandboxId },
        { command, detached: true },
      ),
    )
  }

  async getCommandStatus(
    sandboxId: string,
    processId: number,
    offsets: CommandOffsets,
  ): Promise<CommandStatus> {
    return readCommandStatus(
      await this.transport.request({
        operation: 'commandStatus',
        sandboxId,
        processId,
        offsets,
      }),
      processId,
    )
  }
}
