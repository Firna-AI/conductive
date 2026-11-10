import type { WorkspaceSocketMessage } from '../../src/shared/events'
import type { WorkspaceToRunner } from '../../src/shared/runner'
import { HttpError } from '../http'
import type { WorkspaceChat } from './backend'
import type { BrowserAccess } from './browser-authorization'
import type { BrowserPeer } from './types'
import { afterNumber } from './http-routes'
import { captureUnexpectedWorkerFailure } from '../error-reporting/policy'

function socketPair(request: Request) {
  if (
    request.method !== 'GET' ||
    request.headers.get('Upgrade')?.toLowerCase() !== 'websocket'
  ) {
    throw new HttpError(
      426,
      'websocket_required',
      'Open a new connection to continue.',
    )
  }
  const pair = new WebSocketPair()
  return { client: pair[0], server: pair[1] }
}

export async function browserUpgrade(
  chat: WorkspaceChat,
  request: Request,
  access: BrowserAccess,
): Promise<Response> {
  const { client, server } = socketPair(request)
  server.accept()
  const peer = {
    send: (message: WorkspaceSocketMessage) =>
      server.send(JSON.stringify(message)),
    close: () => server.close(1000, 'Connection closed.'),
  }
  try {
    const unsubscribe = await chat.subscribe(
      access,
      afterNumber(new URL(request.url)),
      peer,
    )
    server.addEventListener('close', unsubscribe)
    server.addEventListener('error', unsubscribe)
    return new Response(null, { status: 101, webSocket: client })
  } catch (error) {
    peer.close()
    throw error
  }
}

export async function openBrowser(
  chat: WorkspaceChat,
  request: Request,
  peer: BrowserPeer,
): Promise<() => void> {
  const access = await chat.authorizeBrowser(request)
  if (access.suffix !== '/events')
    throw new HttpError(404, 'not_found', 'The page is not available.')
  return chat.subscribe(access, afterNumber(new URL(request.url)), peer)
}

export async function runnerUpgrade(
  chat: WorkspaceChat,
  request: Request,
): Promise<Response> {
  const { client, server } = socketPair(request)
  const peer = {
    send: (message: WorkspaceToRunner) => server.send(JSON.stringify(message)),
    close: () => server.close(1000, 'Connection closed.'),
  }
  await chat.connectRunner(request, peer)
  server.accept()
  server.addEventListener('message', (event) => {
    let message: unknown
    try {
      if (typeof event.data !== 'string') throw new Error('Expected JSON text.')
      message = JSON.parse(event.data)
    } catch {
      chat.disconnectRunner(peer)
      return
    }
    void chat.reporting.callback(() =>
      chat.receiveRunner(peer, message).catch((error: unknown) => {
        captureUnexpectedWorkerFailure('runner_message_failed', error)
        chat.disconnectRunner(peer)
      }),
    )
  })
  server.addEventListener('close', () => chat.disconnectRunner(peer))
  server.addEventListener('error', () => chat.disconnectRunner(peer))
  return new Response(null, { status: 101, webSocket: client })
}
