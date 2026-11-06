import { terminalPaths, type TerminalResponse } from '../../src/shared/terminal'
import type { AppEnv } from '../env'
import { HttpError, privateResponse } from '../http'
import {
  recordActivity,
  requireRunning,
  toolError,
  toolRequest,
  verifyTarget,
} from '../previews/access'
import { portRequest } from '../previews/headers'
import { WorkspaceTools } from '../previews/provider'
import { bridgeSocket } from '../previews/socket'
import { AuthorizationBatch } from '../previews/authorization'
import type { ToolDependencies } from '../previews/types'
import { ProviderError } from '../sandbox/errors'
import { terminalPassword } from './credentials'
import { terminalFrames } from './protocol'
import { TERMINAL_PORT } from './service'

export function createTerminalHandler(
  env: AppEnv,
  dependencies: ToolDependencies,
) {
  return {
    fetch: async (request: Request): Promise<Response> => {
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
        const auth = btoa(`conducting:${password}`)
        let upstream: Response
        try {
          upstream = await dependencies.fetch(portRequest(request, port, auth))
        } catch {
          throw new ProviderError('unavailable', 503)
        }
        if (upstream.headers.get('Sec-WebSocket-Protocol') !== 'tty')
          throw new ProviderError('invalid_response', 502)
        const authorization = new AuthorizationBatch(() =>
          verifyTarget(env, target, context.user.id),
        )
        return bridgeSocket(upstream, dependencies, {
          headers: new Headers({
            'Sec-WebSocket-Protocol': 'tty',
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer',
          }),
          authorize: () => authorization.check(),
          fromBrowser: terminalFrames(auth, () =>
            recordActivity(env, dependencies, target.workspaceId, 'terminal'),
          ),
        }).response
      } catch (error) {
        return toolError(error)
      }
    },
  }
}
