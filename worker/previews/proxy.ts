import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { ProviderError } from '../sandbox/errors'
import { recordActivity, toolError } from './access'
import { portRequest, portResponseHeaders } from './headers'
import { WorkspaceTools } from './provider'
import { bridgeSocket } from './socket'
import { activePreview, type PreviewRecord } from './store'
import type { ToolDependencies } from './types'

interface LivePreview {
  workspaceId: string
  previewId: string
  expiresAt: number
  close: () => void
}

export class PreviewProxy {
  private readonly live = new Set<LivePreview>()
  private readonly env: AppEnv
  private readonly dependencies: ToolDependencies

  constructor(env: AppEnv, dependencies: ToolDependencies) {
    this.env = env
    this.dependencies = dependencies
  }

  closePreview(id: string): void {
    for (const socket of this.live) if (socket.previewId === id) socket.close()
  }

  closeWorkspace(workspaceId: string): void {
    for (const socket of this.live)
      if (socket.workspaceId === workspaceId) socket.close()
  }

  expire(): void {
    for (const socket of this.live)
      if (socket.expiresAt <= this.dependencies.now()) socket.close()
  }

  private async authorize(
    hostname: string,
    expected?: PreviewRecord,
  ): Promise<PreviewRecord> {
    const row = await activePreview(
      this.env.DB,
      hostname,
      this.dependencies.now(),
    )
    if (
      !row ||
      (expected &&
        (row.id !== expected.id || row.sandboxId !== expected.sandboxId))
    )
      throw new HttpError(
        404,
        'preview_not_found',
        'The preview is not available.',
      )
    return row
  }

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url)
      const suffix = this.env.PREVIEW_DOMAIN
        ? `.${this.env.PREVIEW_DOMAIN.toLowerCase()}`
        : ''
      const label = suffix ? url.hostname.slice(0, -suffix.length) : ''
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
      const row = await this.authorize(url.hostname)
      const provider = await WorkspaceTools.forWorkspace(
        this.env,
        row,
        this.dependencies.fetch,
      )
      const port = await provider.privatePort(row.port)
      await recordActivity(
        this.env,
        this.dependencies,
        row.workspaceId,
        'preview',
      )
      await this.authorize(url.hostname, row)
      let upstream: Response
      try {
        upstream = await this.dependencies.fetch(portRequest(request, port))
      } catch {
        throw new ProviderError('unavailable', 503)
      }
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
        let live: LivePreview | null = null
        const bridge = bridgeSocket(upstream, this.dependencies, {
          headers,
          authorize: async () => {
            await this.authorize(url.hostname, row)
          },
          onClose: () => {
            if (live) this.live.delete(live)
          },
        })
        live = {
          workspaceId: row.workspaceId,
          previewId: row.id,
          expiresAt: row.expiresAt,
          close: bridge.close,
        }
        this.live.add(live)
        return bridge.response
      }
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      })
    } catch (error) {
      return toolError(error)
    }
  }
}
