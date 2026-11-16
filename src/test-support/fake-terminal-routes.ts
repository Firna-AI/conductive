import { terminalPaths } from '../shared/terminal'
import { RouteError } from '../app/dev/router'
import type { FakeWorkspaceEvents } from './fake-events'
import {
  FakeTerminalList,
  type FakeTerminalWorkspace,
} from './fake-terminal-list'
import { FakeTerminalSocket, fakeTerminalUpgrade } from './fake-terminal-socket'
import { FAKE_ORIGIN } from './fixtures/core'

export class FakeTerminalRoutes {
  readonly sockets: FakeTerminalSocket[] = []
  private readonly workspaces = new Map<string, FakeTerminalList>()

  constructor(
    events: FakeWorkspaceEvents,
    workspaces: readonly FakeTerminalWorkspace[],
    several: boolean,
  ) {
    for (const workspace of workspaces)
      this.workspaces.set(
        terminalPaths.connection(workspace.orgId, workspace.id),
        new FakeTerminalList(workspace, events, several),
      )
  }

  /** Inject this opener into createTerminalConnector to use the app's ttyd codec. */
  open = (path: string, protocol: 'tty'): FakeTerminalSocket => {
    const route = this.match(path)
    if (!route)
      throw new RouteError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    const { list, tail } = route
    const id = this.socketId(tail)
    if (protocol !== 'tty' || id === null)
      throw new RouteError(400, 'terminal_protocol', 'Open the terminal again.')
    const { entry, terminal } = list.connect(id)
    const socket = new FakeTerminalSocket(entry.id, terminal)
    this.sockets.push(socket)
    return socket
  }

  fetch(request: Request): Response | null {
    const route = this.match(request.url)
    if (!route) return null
    try {
      const { list, tail } = route
      if (request.method === 'GET' && tail === '')
        return Response.json(list.state())
      if (request.method === 'POST' && tail === '/terminals')
        return Response.json(list.create(), { status: 201 })
      const close = tail.match(/^\/terminals\/([^/]+)$/)
      if (request.method === 'DELETE' && close)
        return Response.json(list.close(this.decodeId(close[1])))
      if (request.method === 'GET' && this.socketId(tail) !== null) {
        const protocols = (request.headers.get('Sec-WebSocket-Protocol') ?? '')
          .split(',')
          .map((value) => value.trim())
        if (
          request.headers.get('Upgrade')?.toLowerCase() !== 'websocket' ||
          !protocols.includes('tty')
        )
          throw new RouteError(
            400,
            'terminal_protocol',
            'Open the terminal again.',
          )
        return fakeTerminalUpgrade(this.open(request.url, 'tty'))
      }
      return null
    } catch (error) {
      if (!(error instanceof RouteError)) throw error
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      )
    }
  }

  private match(path: string) {
    const pathname = new URL(path, FAKE_ORIGIN).pathname
    for (const [base, list] of this.workspaces)
      if (pathname === base || pathname.startsWith(`${base}/`))
        return { list, tail: pathname.slice(base.length) }
    return null
  }

  private socketId(tail: string): string | undefined | null {
    if (tail === '/socket') return undefined
    const match = tail.match(/^\/terminals\/([^/]+)\/socket$/)
    return match ? this.decodeId(match[1]) : null
  }

  private decodeId(value: string): string {
    try {
      return decodeURIComponent(value)
    } catch {
      throw new RouteError(
        404,
        'terminal_not_found',
        'This terminal is no longer available. Open another terminal.',
      )
    }
  }
}
