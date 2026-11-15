import { PREVIEW_RELAY_MARK_HEADER } from '../../src/shared/previews'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { ProviderError } from '../sandbox/errors'
import { recordActivity, toolError } from './access'
import type { PreviewConnection } from './connection'
import { previewIdentity } from './credentials'
import { portRequest, portResponseHeaders } from './headers'
import {
  previewBrowserLaunch,
  previewHandoff,
  previewHandoffUrl,
} from './launch'
import { PrivatePorts } from './ports'
import { PreviewRegistry } from './registry'
import { ServerTiming, SERVER_TIMING_HEADER } from '../server-timing'
import { bridgeSocket } from './socket'
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
    const timing = new ServerTiming()
    try {
      const url = new URL(request.url)
      const suffix = this.env.PREVIEW_DOMAIN
        ? `.${this.env.PREVIEW_DOMAIN.toLowerCase()}`
        : ''
      const label = suffix ? url.hostname.slice(0, -suffix.length) : ''
      const authorizer = new URL(previewHandoffUrl(this.env))
      if (
        url.origin === authorizer.origin &&
        url.pathname === authorizer.pathname &&
        !url.hash
      ) {
        if (
          request.method === 'GET' &&
          !url.search &&
          !request.headers.has('Upgrade')
        )
          return previewBrowserLaunch()
        return await previewHandoff(request, this.env, this.dependencies.now())
      }
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
      const identity = await previewIdentity(
        request,
        this.env,
        url.hostname,
        this.dependencies.now(),
      )
      if (!identity)
        throw new HttpError(
          404,
          'preview_not_found',
          'The preview is not available.',
        )
      const scope = this.registry.get(identity)
      const active = scope.connect()
      connection = active
      // One read checks the viewer before the sandbox call. It also covers the window that follows.
      const row = await timing.step('access', () => scope.access(active))
      const ready = this.ports.isReady(row)
      const port = await timing.step('relay', () => this.ports.get(row))
      recordActivity(this.dependencies, row.workspaceId)
      // A relay lookup that called the provider can outlast a sandbox change, so it needs a new read.
      if (!ready) scope.refresh()
      await timing.step('check', active.authorize)
      let upstream: Response
      try {
        const outgoing = portRequest(request, port, row.port, {
          body: connection.wrap(request.body),
          signal: connection.signal,
        })
        upstream = await timing.step('upstream', () =>
          this.dependencies.fetch(outgoing),
        )
      } catch {
        this.ports.invalidate(row)
        throw new ProviderError('unavailable', 503)
      }
      if (!upstream.headers.has(PREVIEW_RELAY_MARK_HEADER)) {
        this.ports.invalidate(row)
        void upstream.body?.cancel().catch(() => {})
        upstream.webSocket?.close(1008, 'Connection closed.')
        throw new ProviderError('unavailable', 503)
      }
      await timing.step('check-after', active.authorize)
      const headers = portResponseHeaders(upstream, request, port, row.port)
      // Only a reply that passed every check gets timings, so no refusal shows its reason.
      headers.set(SERVER_TIMING_HEADER, timing.header())
      if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
        const protocol = upstream.headers.get('Sec-WebSocket-Protocol')
        if (
          protocol &&
          !port.credential.stripHeaders.some(
            (name) => name.toLowerCase() === 'sec-websocket-protocol',
          )
        ) {
          const offered = (request.headers.get('Sec-WebSocket-Protocol') ?? '')
            .split(',')
            .map((value) => value.trim())
          if (!offered.includes(protocol))
            throw new ProviderError('invalid_response', 502)
          headers.set('Sec-WebSocket-Protocol', protocol)
        }
        const bridge = bridgeSocket(upstream, this.dependencies, {
          headers,
          authorize: active.authorize,
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
