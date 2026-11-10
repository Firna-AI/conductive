import { PREVIEW_RELAY_PORT } from '../../src/shared/previews'
import type { AppEnv } from '../env'
import type { PrivatePort } from '../sandbox/provider'
import { WorkspaceTools } from './provider'
import { requirePreviewRelay } from './relay'
import { savePreviewSandbox } from './store'
import type { ToolDependencies, WorkspaceTarget } from './types'

interface CachedPort {
  workspaceId: string
  sandboxId: string | null
  descriptor: Promise<PrivatePort>
  pending: boolean
}

/** Plaintext relay tokens live only here, keyed by workspace and sandbox. */
export class PrivatePorts {
  private readonly cache = new Map<string, CachedPort>()
  private readonly env: AppEnv
  private readonly dependencies: ToolDependencies

  constructor(env: AppEnv, dependencies: ToolDependencies) {
    this.env = env
    this.dependencies = dependencies
  }

  private key(target: WorkspaceTarget): string {
    return JSON.stringify([target.workspaceId, target.sandboxId])
  }

  invalidateWorkspace(workspaceId: string): void {
    for (const [key, value] of this.cache)
      if (value.workspaceId === workspaceId) this.cache.delete(key)
  }

  invalidate(target: WorkspaceTarget): void {
    this.cache.delete(this.key(target))
  }

  async open(target: WorkspaceTarget, userId: string): Promise<PrivatePort> {
    return this.resolve(target, true, userId)
  }

  get(target: WorkspaceTarget): Promise<PrivatePort> {
    return this.resolve(target)
  }

  private resolve(
    target: WorkspaceTarget,
    refresh = false,
    userId?: string,
  ): Promise<PrivatePort> {
    for (const [key, value] of this.cache) {
      if (
        value.workspaceId === target.workspaceId &&
        value.sandboxId !== target.sandboxId
      )
        this.cache.delete(key)
    }
    const key = this.key(target)
    const existing = this.cache.get(key)
    if (existing && (!refresh || existing.pending)) return existing.descriptor
    const descriptor = (async () => {
      const provider = await WorkspaceTools.forWorkspace(
        this.env,
        target,
        this.dependencies.fetch,
        userId,
      )
      await requirePreviewRelay(provider)
      const hosted = await provider.privatePort(PREVIEW_RELAY_PORT, 'localhost')
      await savePreviewSandbox(this.env.DB, target)
      return hosted
    })()
    const entry = {
      workspaceId: target.workspaceId,
      sandboxId: target.sandboxId,
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
