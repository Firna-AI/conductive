import { terminalPaths, type TerminalResponse } from '../../src/shared/terminal'
import type { AppEnv } from '../env'
import { HttpError, privateResponse } from '../http'
import {
  requireRunning,
  toolError,
  toolRequest,
  verifyTarget,
} from '../previews/access'
import { portRequest } from '../previews/headers'
import { WorkspaceTools } from '../previews/provider'
import { bridgeSocket } from '../previews/socket'
import type { ToolDependencies } from '../previews/types'
import { ProviderError } from '../sandbox/errors'
import { terminalPassword } from './credentials'
import { terminalFrames } from './protocol'
import { TERMINAL_PORT } from './service'
import { TerminalConnections, type TerminalRegistration } from './connections'

export function createTerminalHandler(
  env: AppEnv,
  dependencies: ToolDependencies,
) {
  const connections = new TerminalConnections(env, dependencies)
  return {
    fetch: async (request: Request): Promise<Response> => {
      let registration: TerminalRegistration | null = null
      try {
        const { context, target, tail } = await toolRequest(
          request,
          env,
          dependencies.now(),
          'terminal',
        )
        if (request.method !== 'GET' || (tail !== null && tail !== 'socket')) {
          throw new HttpError(404, 'not_found', 'The page is not available.')
        }
        if (tail === 'socket') {
          const protocols = (
            request.headers.get('Sec-WebSocket-Protocol') ?? ''
          )
            .split(',')
            .map((value) => value.trim())
          if (
            request.headers.get('Upgrade')?.toLowerCase() !== 'websocket' ||
            !protocols.includes('tty')
          ) {
            throw new HttpError(
              400,
              'terminal_protocol',
              'Open the terminal again.',
            )
          }
        }
        const password = await terminalPassword(
          env,
          target.workspaceId,
          target.sandboxId,
          target.providerAccount,
        )
        if (tail === null) {
          const stopped = ['stopped', 'error'].includes(target.state)
          const ready =
            ['ready', 'working', 'unread', 'input'].includes(target.state) &&
            target.sandboxId &&
            password
          const response: TerminalResponse = ready
            ? {
                state: 'ready',
                socketPath: terminalPaths.socket(
                  target.orgId,
                  target.workspaceId,
                ),
                protocol: 'tty',
              }
            : { state: stopped ? 'stopped' : 'starting', socketPath: null }
          return privateResponse(Response.json(response))
        }
        requireRunning(target)
        if (!password)
          throw new HttpError(
            409,
            'terminal_starting',
            'The terminal is starting. Try again.',
          )
        const provider = await WorkspaceTools.forWorkspace(
          env,
          target,
          dependencies.fetch,
          context.user.id,
        )
        const port = await provider.privatePort(TERMINAL_PORT, 'network')
        await verifyTarget(env, target, context.user.id)
        if (!target.sandboxId)
          throw new HttpError(
            409,
            'terminal_starting',
            'The terminal is starting. Try again.',
          )
        registration = await connections.add({
          kind: 'sandbox',
          sessionId: context.sessionId,
          userId: context.user.id,
          orgId: target.orgId,
          workspaceId: target.workspaceId,
          sandboxId: target.sandboxId,
          providerAccount: target.providerAccount,
        })
        const auth = btoa(`conductive:${password}`)
        let upstream: Response
        try {
          upstream = await dependencies.fetch(portRequest(request, port, auth))
        } catch {
          throw new ProviderError('unavailable', 503)
        }
        if (upstream.headers.get('Sec-WebSocket-Protocol') !== 'tty')
          throw new ProviderError('invalid_response', 502)
        const bridge = bridgeSocket(upstream, dependencies, {
          headers: new Headers({
            'Sec-WebSocket-Protocol': 'tty',
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer',
          }),
          authorize: registration.check,
          onClose: registration.dispose,
          fromBrowser: terminalFrames(auth),
        })
        registration.attach(bridge.close)
        await registration.check()
        return bridge.response
      } catch (error) {
        registration?.dispose()
        return toolError(error)
      }
    },
  }
}
