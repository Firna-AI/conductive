import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { requireRunning, workspaceTarget } from './access'
import type { PrivatePorts } from './ports'
import type { PreviewProxy } from './proxy'
import {
  insertPreview,
  listPreviews,
  publicPreview,
  revokePreview,
} from './store'
import type { ToolDependencies } from './types'
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
    const label = Array.from(
      crypto.getRandomValues(new Uint8Array(16)),
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('')
    const row = {
      ...target,
      id: crypto.randomUUID(),
      hostname: `${label}.${domain}`,
      port,
      expiresAt: now + 86_400_000,
    }
    if (!(await insertPreview(this.env.DB, target, row, userId, now))) {
      requireRunning(
        await workspaceTarget(
          this.env,
          target.orgId,
          target.workspaceId,
          userId,
        ),
      )
      throw new HttpError(
        409,
        'sandbox_not_ready',
        'Open the workspace to start its cloud computer.',
      )
    }
    return publicPreview(row, origin)
  }

  async close(
    target: WorkspaceAccessTarget,
    previewId: string,
    now = this.dependencies.now(),
  ) {
    const closed = await revokePreview(this.env.DB, target, previewId, now)
    this.proxy.closePreview(target.workspaceId, previewId)
    return closed
  }
}
