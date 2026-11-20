import { FILE_SERVER_UNAVAILABLE } from '../../src/shared/previews'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { requireRunning, workspaceTarget } from './access'
import type { PrivatePorts } from './ports'
import type { PreviewProxy } from './proxy'
import { activeFilesPreview } from './files-store'
import {
  insertPreview,
  listPreviews,
  publicPreview,
  revokePreview,
  type PreviewRecord,
} from './store'
import type { ToolDependencies, WorkspaceTarget } from './types'
import type { WorkspaceAccessTarget } from './workspace-store'

function previewDomain(env: AppEnv, appOrigin: string): string {
  const domain = env.PREVIEW_DOMAIN?.toLowerCase()
  const appHost = new URL(appOrigin).hostname
  const appDomain = appHost.startsWith('app.') ? appHost.slice(4) : appHost
  if (
    !domain ||
    !/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(domain) ||
    domain === appDomain ||
    domain.endsWith(`.${appDomain}`) ||
    appDomain.endsWith(`.${domain}`)
  ) {
    throw new HttpError(
      503,
      'preview_unavailable',
      'The preview is not available. Try again.',
    )
  }
  return domain
}

function newPreview(
  target: WorkspaceTarget,
  domain: string,
  port: number,
  now: number,
): PreviewRecord {
  const label = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  return {
    ...target,
    id: crypto.randomUUID(),
    hostname: `${label}.${domain}`,
    port,
    expiresAt: now + 86_400_000,
  }
}

export class PreviewActions {
  private readonly env: AppEnv
  private readonly dependencies: ToolDependencies
  private readonly ports: PrivatePorts
  private readonly proxy: PreviewProxy

  constructor(
    env: AppEnv,
    dependencies: ToolDependencies,
    ports: PrivatePorts,
    proxy: PreviewProxy,
  ) {
    this.env = env
    this.dependencies = dependencies
    this.ports = ports
    this.proxy = proxy
  }

  list(
    target: WorkspaceAccessTarget,
    origin: string,
    now = this.dependencies.now(),
  ) {
    return listPreviews(this.env.DB, target, now, origin)
  }

  async open(
    target: WorkspaceAccessTarget,
    userId: string,
    port: unknown,
    origin: string,
    now = this.dependencies.now(),
  ) {
    requireRunning(target)
    if (
      typeof port !== 'number' ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      throw new HttpError(400, 'invalid_port', 'Enter a port from 1 to 65535.')
    }
    const domain = previewDomain(this.env, origin)
    await this.ports.open(target, userId)
    const row = newPreview(target, domain, port, now)
    if (!(await insertPreview(this.env.DB, target, row, userId, now))) {
      await this.insertFailure(target, userId)
    }
    return publicPreview(row, origin)
  }

  async openFiles(
    target: WorkspaceAccessTarget,
    userId: string,
    origin: string,
    now = this.dependencies.now(),
  ) {
    requireRunning(target)
    if (!this.dependencies.fileServerAvailable?.(target.workspaceId))
      throw new HttpError(
        409,
        FILE_SERVER_UNAVAILABLE,
        'The preview needs newer cloud computer software. Select Restart in the workspace header.',
      )
    const domain = previewDomain(this.env, origin)
    await this.ports.open(target, userId)
    const row = newPreview(target, domain, 0, now)
    if (await insertPreview(this.env.DB, target, row, userId, now))
      return { preview: publicPreview(row, origin), created: true }
    const active = await activeFilesPreview(this.env.DB, target, userId, now)
    if (active)
      return { preview: publicPreview(active, origin), created: false }
    return this.insertFailure(target, userId)
  }

  private async insertFailure(
    target: WorkspaceAccessTarget,
    userId: string,
  ): Promise<never> {
    requireRunning(
      await workspaceTarget(this.env, target.orgId, target.workspaceId, userId),
    )
    throw new HttpError(
      409,
      'sandbox_not_ready',
      'Open the workspace to start its cloud computer.',
    )
  }

  async close(
    target: WorkspaceAccessTarget,
    previewId: string,
    now = this.dependencies.now(),
  ) {
    const closed = await revokePreview(this.env.DB, target, previewId, now)
    if (closed) this.proxy.closePreview(target.workspaceId, previewId)
    return closed
  }
}
