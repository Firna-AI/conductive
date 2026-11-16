import { terminalPaths, type TerminalResponse } from '../../src/shared/terminal'
import type { AppEnv } from '../env'
import { HttpError, privateResponse } from '../http'
import { toolError } from '../previews/access'
import type { ToolDependencies } from '../previews/types'
import { terminalPassword, terminalSeveral } from './credentials'
import { initialTerminals } from './list-store'
import { mutateTerminal } from './mutations'
import { terminalRequest } from './request'
import { openTerminalSocket } from './socket'
import type { WorkspaceTerminals } from './workspace'
import { TerminalConnections } from './connections'

export function createTerminalHandler(
  env: AppEnv,
  dependencies: ToolDependencies,
  terminals?: WorkspaceTerminals,
) {
  const connections = new TerminalConnections(env, dependencies)
  return {
    fetch: async (request: Request): Promise<Response> => {
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
        return await openTerminalSocket(
          env,
          dependencies,
          connections,
          terminals,
          {
            request,
            target,
            userId: context.user.id,
            sessionId: context.sessionId,
            terminalId: route.terminalId,
            password,
          },
        )
      } catch (error) {
        return toolError(error)
      }
    },
  }
}
