import { FIRST_TERMINAL_ID, TERMINAL_PORT } from '../../src/shared/terminal'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { requireRunning, verifyTarget } from '../previews/access'
import { portRequest } from '../previews/headers'
import { WorkspaceTools } from '../previews/provider'
import { bridgeSocket } from '../previews/socket'
import type { ToolDependencies } from '../previews/types'
import type { WorkspaceAccessTarget } from '../previews/workspace-store'
import { ProviderError } from '../sandbox/errors'
import { TerminalConnections, type TerminalRegistration } from './connections'
import { terminalFrames } from './protocol'
import { TerminalSocketLease, terminalNotFound } from './socket-lease'
import type { WorkspaceTerminals } from './workspace'

export async function openTerminalSocket(
  env: AppEnv,
  dependencies: ToolDependencies,
  connections: TerminalConnections,
  terminals: WorkspaceTerminals | undefined,
  input: {
    request: Request
    target: WorkspaceAccessTarget
    userId: string
    sessionId: string
    terminalId?: string
    password: string | null
  },
): Promise<Response> {
  const { request, target, userId, sessionId, terminalId, password } = input
  requireRunning(target)
  if (!password)
    throw new HttpError(
      409,
      'terminal_starting',
      'The terminal is starting. Try again.',
    )
  if (
    !terminals &&
    terminalId !== undefined &&
    terminalId !== FIRST_TERMINAL_ID
  )
    throw terminalNotFound()
  const lease = terminals
    ? await terminals.openSocket(target.orgId, target.workspaceId, terminalId)
    : new TerminalSocketLease(FIRST_TERMINAL_ID)
  let registration: TerminalRegistration | null = null
  let upstream: Response | null = null
  let close: (() => void) | null = null
  const dispose = () => {
    registration?.dispose()
    lease.dispose()
  }
  try {
    const provider = await WorkspaceTools.forWorkspace(
      env,
      target,
      dependencies.fetch,
      userId,
    )
    const port = await provider.privatePort(TERMINAL_PORT, 'network')
    await verifyTarget(env, target, userId)
    if (!target.sandboxId) throw new ProviderError('unavailable', 503)
    registration = await connections.add({
      kind: 'sandbox',
      sessionId,
      userId,
      orgId: target.orgId,
      workspaceId: target.workspaceId,
      sandboxId: target.sandboxId,
      providerAccount: target.providerAccount,
    })
    const auth = btoa(`conductive:${password}`)
    const trusted = portRequest(request, port, auth)
    const url = new URL(trusted.url)
    if (lease.terminalId !== FIRST_TERMINAL_ID)
      url.searchParams.set('arg', lease.terminalId)
    lease.check()
    try {
      upstream = await dependencies.fetch(new Request(url, trusted))
    } catch {
      throw new ProviderError('unavailable', 503)
    }
    lease.check()
    if (upstream.headers.get('Sec-WebSocket-Protocol') !== 'tty')
      throw new ProviderError('invalid_response', 502)
    const bridge = bridgeSocket(upstream, dependencies, {
      headers: new Headers({
        'Sec-WebSocket-Protocol': 'tty',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      }),
      authorize: registration.check,
      onClose: dispose,
      fromBrowser: terminalFrames(auth),
    })
    close = bridge.close
    lease.attach(bridge.close)
    registration.attach(bridge.close)
    await registration.check()
    lease.check()
    return bridge.response
  } catch (error) {
    dispose()
    if (close) close()
    else if (upstream?.webSocket) {
      upstream.webSocket.accept()
      upstream.webSocket.close(1008, 'Connection closed.')
    }
    throw error
  }
}
