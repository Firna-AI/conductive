import type { Workspace } from './activity-entry.test-support'
import { previewsPath } from '../../src/shared/previews'
import { number, record, string } from '../chat/inputs'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { featureFixture } from './fixture.test-support'
import {
  Response as RuntimeResponse,
  WebSocketPair,
  type WebSocket,
} from 'miniflare'
import { terminalPaths } from '../../src/shared/terminal'
import { cacheTerminalPassword } from '../terminal/credentials'

export class TerminalActivityUpstream {
  private readonly messages: string[] = []
  private readonly receivers: ((value: string) => void)[] = []
  socket: WebSocket | undefined

  fetch(request: Request): RuntimeResponse | undefined {
    if (
      !new URL(request.url).hostname.endsWith('.on.boat.dev') ||
      request.headers.get('Upgrade') !== 'websocket'
    )
      return
    const pair = new WebSocketPair()
    this.socket = pair[0]
    pair[0].accept()
    pair[0].addEventListener('message', (event) => {
      const value =
        typeof event.data === 'string'
          ? event.data
          : new TextDecoder().decode(event.data)
      const receive = this.receivers.shift()
      if (receive) receive(value)
      else this.messages.push(value)
    })
    return new RuntimeResponse(null, {
      status: 101,
      webSocket: pair[1],
      headers: { 'Sec-WebSocket-Protocol': 'tty' },
    })
  }

  next(): Promise<string> {
    const message = this.messages.shift()
    return message === undefined
      ? new Promise((resolve) => this.receivers.push(resolve))
      : Promise.resolve(message)
  }
}

export async function openActivityTerminal(fixture: ActivityFixture) {
  await cacheTerminalPassword(
    fixture.env,
    {
      orgId: OUTER_ORG,
      workspaceId: OUTER_WORKSPACE,
      sandboxId: 'bx_activity',
      state: 'ready',
    },
    'b'.repeat(64),
    fixture.now,
  )
  const response = await fixture.request(
    terminalPaths.socket(OUTER_ORG, OUTER_WORKSPACE),
    {
      headers: { Upgrade: 'websocket', 'Sec-WebSocket-Protocol': 'tty' },
    },
  )
  if (!response.webSocket) throw new Error('Missing terminal socket')
  response.webSocket.accept()
  return response.webSocket
}

export async function activityFixture(
  bundle: string,
  options: Parameters<typeof featureFixture>[1] = {},
) {
  const fixture = await featureFixture(bundle, options)
  const bindings = await fixture.runtime.getBindings<{
    WORKSPACES: DurableObjectNamespace<Workspace>
  }>()
  const actor = bindings.WORKSPACES.getByName(OUTER_WORKSPACE)
  const now = await actor.activityTime()
  await fixture.env.DB.prepare(
    "UPDATE workspaces SET sandbox_id = 'bx_activity', last_activity_at = ? WHERE id = ?",
  )
    .bind(now - 1_700_000, OUTER_WORKSPACE)
    .run()
  await actor.seedFeatureState({
    'lifecycle:state': {
      workspaceId: OUTER_WORKSPACE,
      orgId: OUTER_ORG,
      state: 'ready',
      start: null,
      pendingFirstMessage: null,
      lastActivityAt: now - 1_700_000,
      runningSessions: [],
      runnerConnected: true,
      stoppedAt: null,
      nextDiskKeepaliveAt: null,
      error: null,
    },
  })
  await actor.lifecyclePrepared()
  return { ...fixture, actor: () => actor, now }
}

export type ActivityFixture = Awaited<ReturnType<typeof activityFixture>>

export async function openActivityPreview(fixture: ActivityFixture) {
  const opened = await fixture.request(
    previewsPath(OUTER_ORG, OUTER_WORKSPACE),
    {
      method: 'POST',
      body: JSON.stringify({ port: 3000 }),
    },
  )
  if (opened.status !== 201) throw new Error('Preview did not open')
  const preview = record(record(await opened.json()).preview)
  const launch = await fixture.request(new URL(string(preview.url)).pathname, {
    headers: { Accept: 'application/json' },
  })
  const address = new URL(string(record(await launch.json()).url))
  const fragment = new URLSearchParams(address.hash.slice(1))
  address.hash = ''
  address.searchParams.set('hostname', fragment.get('hostname') ?? '')
  const authorized = await fixture.runtime.dispatchFetch(address.href, {
    method: 'POST',
    headers: {
      Origin: address.origin,
      Authorization: `Bearer ${fragment.get('grant')}`,
    },
  })
  const cookie = authorized.headers.get('Set-Cookie')?.split(';')[0]
  if (!cookie) throw new Error('Missing preview credential')
  const target = string(record(await authorized.json()).url)
  return () =>
    fixture.runtime.dispatchFetch(target, { headers: { Cookie: cookie } })
}

export async function hostedActivityPort(
  request: Request,
): Promise<Response | undefined> {
  const url = new URL(request.url)
  if (url.hostname.endsWith('.on.boat.dev'))
    return new Response('forwarded input')
  if (url.pathname.endsWith('/host')) {
    const port = number(record(await request.clone().json()).port)
    return Response.json({
      ok: true,
      type: 'port.hosted',
      port,
      url: `https://sandbox-${port}.on.boat.dev?_token=server-port-token`,
      access: 'private',
      isProtected: true,
    })
  }
  if (
    url.pathname.endsWith('/commands') &&
    record(await request.clone().json()).command ===
      'systemctl is-active --quiet conductive-preview-relay.service'
  )
    return Response.json({
      ok: true,
      type: 'command.finished',
      exitCode: 0,
      stdout: '',
      stderr: '',
      timedOut: false,
    })
}
