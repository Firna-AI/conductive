import type { HttpFetch } from '../env'
import { readSandboxFile } from './file-read'
import { readAccount, readCommand, readSandbox, readSnapshot } from './parsers'
import type { BoatAccount, SandboxProvider, SandboxStart } from './provider'
import { BoatTransport } from './transport'

export class BoatClient implements SandboxProvider {
  private readonly transport: BoatTransport

  constructor(key: string, fetch: HttpFetch, account: BoatAccount) {
    this.transport = new BoatTransport(key, fetch, account)
  }

  readFile(sandboxId: string, path: string, maxBytes: number) {
    return readSandboxFile(this.transport, sandboxId, path, maxBytes)
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
}
