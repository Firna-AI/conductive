import type { AppEnv } from '../env'
import { listenerMode } from './listeners'
import { WorkspaceTools } from './provider'
import type { PortMode, PrivatePort } from '../sandbox/provider'
import { savePreviewMode, type PreviewRecord } from './store'
import type { ToolDependencies, WorkspaceTarget } from './types'

interface Descriptor {
  mode: PortMode
  port: PrivatePort
}
interface CachedPort {
  workspaceId: string
  sandboxId: string | null
  providerAccount: string
  descriptor: Promise<Descriptor>
  pending: boolean
}

/** Plaintext port tokens live only here, keyed by workspace, sandbox, and port. */
export class PrivatePorts {
  private readonly cache = new Map<string, CachedPort>()
  private readonly env: AppEnv
  private readonly dependencies: ToolDependencies

  constructor(env: AppEnv, dependencies: ToolDependencies) {
    this.env = env
    this.dependencies = dependencies
  }

  private key(target: WorkspaceTarget, port: number): string {
    return JSON.stringify([
      target.workspaceId,
      target.providerAccount,
      target.sandboxId,
      port,
    ])
  }

  invalidateWorkspace(workspaceId: string): void {
    for (const [key, value] of this.cache)
      if (value.workspaceId === workspaceId) this.cache.delete(key)
  }

  invalidate(target: WorkspaceTarget, port: number): void {
    this.cache.delete(this.key(target, port))
  }

  async open(
    target: WorkspaceTarget,
    port: number,
    userId: string,
  ): Promise<Descriptor> {
    return this.resolve(target, port, undefined, false, userId)
  }

  async get(row: PreviewRecord, refresh: boolean): Promise<PrivatePort> {
    const descriptor = await this.resolve(
      row,
      row.port,
      row.listenerSandboxId === row.sandboxId &&
        row.listenerProviderAccount === row.providerAccount
        ? (row.listenerMode ?? undefined)
        : undefined,
      refresh,
    )
    return descriptor.port
  }

  private resolve(
    target: WorkspaceTarget,
    port: number,
    fallback?: PortMode,
    refresh = false,
    userId?: string,
  ): Promise<Descriptor> {
    for (const [key, value] of this.cache) {
      if (
        value.workspaceId === target.workspaceId &&
        (value.sandboxId !== target.sandboxId ||
          value.providerAccount !== target.providerAccount)
      )
        this.cache.delete(key)
    }
    const key = this.key(target, port)
    const existing = this.cache.get(key)
    if (existing && (!refresh || existing.pending)) return existing.descriptor
    const descriptor = (async () => {
      const provider = await WorkspaceTools.forWorkspace(
        this.env,
        target,
        this.dependencies.fetch,
        userId,
      )
      const mode = await listenerMode(provider, port, fallback)
      const hosted = await provider.privatePort(port, mode)
      await savePreviewMode(this.env.DB, target, port, mode)
      return { mode, port: hosted }
    })()
    const entry = {
      workspaceId: target.workspaceId,
      sandboxId: target.sandboxId,
      providerAccount: target.providerAccount,
      descriptor,
      pending: true,
    }
    this.cache.set(key, entry)
    void descriptor.then(
      () => {
        entry.pending = false
      },
      () => {
        if (this.cache.get(key) === entry) this.cache.delete(key)
      },
    )
    return descriptor
  }
}
