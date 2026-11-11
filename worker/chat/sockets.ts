import type { WorkspaceSocketMessage } from '../../src/shared/events'
import type { WorkspaceToRunner } from '../../src/shared/runner'
import { HttpError } from '../http'
import type { WorkspaceChat } from './backend'
import type { BrowserAccess } from './browser-authorization'
import { afterNumber } from './http-routes'

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
  const peer = {
    send: (message: WorkspaceSocketMessage) =>
      server.send(JSON.stringify(message)),
    close: () => server.close(1000, 'Connection closed.'),
  }
  try {
    await chat.subscribe(
      access,
      afterNumber(new URL(request.url)),
      peer,
      server,
    )
    return new Response(null, { status: 101, webSocket: client })
  } catch (error) {
    peer.close()
    throw error
  }
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
  await chat.connectRunner(request, peer, server)
  return new Response(null, { status: 101, webSocket: client })
}
