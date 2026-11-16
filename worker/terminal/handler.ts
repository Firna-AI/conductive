import {
  TERMINAL_PORT,
  terminalPaths,
  type TerminalResponse,
} from '../../src/shared/terminal'
import type { AppEnv } from '../env'
import { HttpError, privateResponse } from '../http'
import { requireRunning, toolError, verifyTarget } from '../previews/access'
import { portRequest } from '../previews/headers'
import { WorkspaceTools } from '../previews/provider'
import { bridgeSocket } from '../previews/socket'
import type { ToolDependencies } from '../previews/types'
import { ProviderError } from '../sandbox/errors'
import { terminalPassword, terminalSeveral } from './credentials'
import { initialTerminals } from './list-store'
import { mutateTerminal } from './mutations'
import { terminalRequest } from './request'
import type { WorkspaceTerminals } from './workspace'
import { terminalFrames } from './protocol'
import { TerminalConnections, type TerminalRegistration } from './connections'

export function createTerminalHandler(
  env: AppEnv,
  dependencies: ToolDependencies,
  terminals?: WorkspaceTerminals,
) {
  const connections = new TerminalConnections(env, dependencies)
  return {
    fetch: async (request: Request): Promise<Response> => {
      let registration: TerminalRegistration | null = null
      try {
        const { context, target, route } = await terminalRequest(
          request,
          env,
          dependencies.now(),
        )
        if (route.kind === 'create' || route.kind === 'close') {
          return await mutateTerminal(
            env,
            dependencies,
            terminals,
            target,
            context.user.id,
            route,
          )
        }
        if (route.kind === 'socket') {
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
        if (route.kind === 'state') {
          const list = terminals
            ? await terminals.list(target.orgId, target.workspaceId)
            : initialTerminals(target.orgId, target.workspaceId)
          const several = await terminalSeveral(
            env,
            target.workspaceId,
            target.sandboxId,
            target.providerAccount,
          )
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
                terminals: list,
                several,
              }
            : {
                state: stopped ? 'stopped' : 'starting',
                socketPath: null,
                terminals: list,
                several,
              }
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
