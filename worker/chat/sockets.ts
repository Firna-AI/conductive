import type { WorkspaceToRunner } from '../../src/shared/generated/WorkspaceToRunner'
import type { WorkspaceSocketMessage } from '../../src/shared/events'
import { HttpError, warnUnexpectedError } from '../http'
import type { WorkspaceChat } from './backend'
import type { BrowserAccess } from './browser-authorization'
import { closeTab } from './browser-subscription'
import { afterNumber } from './http-routes'
import type { BrowserPeer } from './types'
import {
  readBrowserEventForms,
  type BrowserEventsCursor,
} from './browser-event-forms'

function browserEventsCursor(request: Request): BrowserEventsCursor {
  const url = new URL(request.url)
  return {
    after: afterNumber(url),
    forms: readBrowserEventForms(url.searchParams.get('forms')?.split(',')),
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
  return chat.subscribe(access, browserEventsCursor(request), peer)
}

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

/**
 * Answers the events socket once the tab is registered, before its history.
 * A refusal before then is the HTTP reply. The history pages follow the
 * handshake, so the tab reads them while the replay goes on. The replay
 * closes the socket itself when it fails. The route logs the failure.
 */
export async function browserUpgrade(
  chat: WorkspaceChat,
  request: Request,
  access: BrowserAccess,
): Promise<Response> {
  const { client, server } = socketPair(request)
  const cursor = browserEventsCursor(request)
  const peer = {
    send: (message: WorkspaceSocketMessage) =>
      server.send(JSON.stringify(message)),
    close: () => server.close(1000, 'Connection closed.'),
  }
  let registered: () => void = () => undefined
  const ready = new Promise<void>((resolve) => {
    registered = resolve
  })
  const replay = chat.subscribe(access, cursor, peer, server, () =>
    registered(),
  )
  try {
    await Promise.race([ready, replay])
  } catch (error) {
    closeTab(peer)
    throw error
  }
  void replay.catch((error: unknown) => warnUnexpectedError(error, request))
  return new Response(null, { status: 101, webSocket: client })
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
