import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { ProviderError } from '../sandbox/errors'
import { recordActivity, toolError } from './access'
import type { PreviewConnection } from './connection'
import { previewAuthorized } from './credentials'
import { portRequest, portResponseHeaders } from './headers'
import { previewHandoff, previewHandoffUrl } from './launch'
import { PrivatePorts } from './ports'
import { PreviewRegistry } from './registry'
import { bridgeSocket } from './socket'
import { activePreview } from './store'
import type { ToolDependencies } from './types'

export class PreviewProxy {
  private readonly env: AppEnv
  private readonly dependencies: ToolDependencies
  private readonly ports: PrivatePorts
  private readonly registry: PreviewRegistry

  constructor(
    env: AppEnv,
    dependencies: ToolDependencies,
    ports: PrivatePorts,
  ) {
    this.env = env
    this.dependencies = dependencies
    this.ports = ports
    this.registry = new PreviewRegistry(env, dependencies)
  }

  closePreview(workspaceId: string, id: string): void {
    this.registry.closePreview(workspaceId, id)
  }
  closeWorkspace(workspaceId: string): void {
    this.registry.closeWorkspace(workspaceId)
    this.ports.invalidateWorkspace(workspaceId)
  }
  expire(): void {
    this.registry.expire()
  }

  async fetch(request: Request): Promise<Response> {
    let connection: PreviewConnection | null = null
    try {
      const url = new URL(request.url)
      const suffix = this.env.PREVIEW_DOMAIN
        ? `.${this.env.PREVIEW_DOMAIN.toLowerCase()}`
        : ''
      const label = suffix ? url.hostname.slice(0, -suffix.length) : ''
      if (url.href === previewHandoffUrl(this.env))
        return await previewHandoff(request, this.env, this.dependencies.now())
      if (
        url.protocol !== 'https:' ||
        url.port ||
        !suffix ||
        !url.hostname.endsWith(suffix) ||
        !/^[a-f0-9]{32}$/.test(label)
      ) {
        throw new HttpError(
          404,
          'preview_not_found',
          'The preview is not available.',
        )
      }
      const row = await activePreview(
        this.env.DB,
        url.hostname,
        this.dependencies.now(),
      )
      if (!row)
        throw new HttpError(
          404,
          'preview_not_found',
          'The preview is not available.',
        )
      if (
        !(await previewAuthorized(
          request,
          this.env,
          row,
          this.dependencies.now(),
        ))
      )
        throw new HttpError(
          404,
          'preview_not_found',
          'The preview is not available.',
        )
      const scope = this.registry.get(row)
      connection = scope.connect()
      const destination = request.headers.get('Sec-Fetch-Dest')
      const refresh = destination === 'document' || destination === 'iframe'
      const port = await this.ports.get(row, refresh)
      await recordActivity(
        this.env,
        this.dependencies,
        row.workspaceId,
        'preview',
      )
      await scope.authorize()
      let upstream: Response
      try {
        const outgoing = portRequest(request, port, undefined, {
          body: connection.wrap(request.body),
          signal: connection.signal,
        })
        upstream = await this.dependencies.fetch(outgoing)
      } catch {
        this.ports.invalidate(row, row.port)
        throw new ProviderError('unavailable', 503)
      }
      if ([401, 403].includes(upstream.status))
        this.ports.invalidate(row, row.port)
      await scope.authorize()
      const headers = portResponseHeaders(upstream, request, port)
      if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
        const protocol = upstream.headers.get('Sec-WebSocket-Protocol')
        if (protocol) {
          const offered = (request.headers.get('Sec-WebSocket-Protocol') ?? '')
            .split(',')
            .map((value) => value.trim())
          if (!offered.includes(protocol))
            throw new ProviderError('invalid_response', 502)
          headers.set('Sec-WebSocket-Protocol', protocol)
        }
        const bridge = bridgeSocket(upstream, this.dependencies, {
          headers,
          authorize: scope.authorize,
          onClose: () => connection?.close(),
        })
        connection.watch(bridge.close)
        return bridge.response
      }
      const response = new Response(connection.wrap(upstream.body), {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      })
      connection.finishHeaders()
      return response
    } catch (error) {
      connection?.close()
      return toolError(error)
    }
  }
}
