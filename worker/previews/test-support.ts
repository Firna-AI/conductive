import { storeBoatKey } from '../sandbox/keys'
import { createHarness, TEST_ORIGIN, TEST_TIME } from '../test-support/harness'
import type { ProxySocket, SocketRuntime } from './types'

export class TestSocket implements ProxySocket {
  accepted = false
  sent: (string | ArrayBuffer)[] = []
  closed: { code?: number; reason?: string } | null = null
  private messages: ((event: { data: string | ArrayBuffer }) => void)[] = []
  private endings: (() => void)[] = []
  private receive: ((data: string | ArrayBuffer) => void) | null = null
  private ended: (() => void) | null = null
  private observers: (() => void)[] = []
  readonly end = new Promise<void>((resolve) => {
    this.ended = resolve
  })

  accept() {
    this.accepted = true
  }

  send(data: string | ArrayBuffer) {
    this.sent.push(data)
    this.receive?.(data)
    this.receive = null
    for (const observer of this.observers) observer()
  }

  whenSent(count: number): Promise<void> {
    return new Promise((resolve) => {
      const observe = () => {
        if (this.sent.length >= count) resolve()
      }
      this.observers.push(observe)
      observe()
    })
  }

  nextMessage() {
    return new Promise<string | ArrayBuffer>((resolve) => {
      this.receive = resolve
    })
  }

  close(code?: number, reason?: string) {
    if (this.closed) return
    this.closed = { code, reason }
    this.ended?.()
    for (const listener of this.endings) listener()
  }

  addEventListener(
    type: 'message' | 'close' | 'error',
    listener: ((event: { data: string | ArrayBuffer }) => void) | (() => void),
  ) {
    if (type === 'message') this.messages.push(listener)
    else this.endings.push(() => listener({ data: '' }))
  }

  emit(data: string | ArrayBuffer) {
    for (const listener of this.messages) listener({ data })
  }
}

export function socketResponse(socket: ProxySocket, protocol = '') {
  const response = new Response(null, {
    headers: protocol ? { 'Sec-WebSocket-Protocol': protocol } : {},
  })
  Object.defineProperties(response, {
    status: { value: 101 },
    webSocket: { value: socket },
  })
  return response
}

export async function createToolsHarness() {
  const core = await createHarness()
  core.env.PREVIEW_DOMAIN = 'conducting-previews.test'
  core.boat.accounts.set('boat-test-key', {
    id: 'test-wallet',
    type: 'personal',
  })
  let now = TEST_TIME
  let desktopSequence = 0
  let terminalSequence = 0
  const passwords = new Map<string, string>()
  const requests: Request[] = []
  const serverSockets: TestSocket[] = []
  const upstreamSockets: TestSocket[] = []
  let response: (() => Response) | null = null
  const sockets: SocketRuntime = {
    pair: () => {
      const client = new TestSocket()
      const server = new TestSocket()
      serverSockets.push(server)
      return {
        server,
        response: (headers) => {
          const result = socketResponse(client)
          for (const [name, value] of headers) result.headers.set(name, value)
          return result
        },
      }
    },
  }
  const dependencies = {
    now: () => now,
    sockets,
    fetch: async (request: Request) => {
      requests.push(request.clone())
      if (response) return response()
      const url = new URL(request.url)
      if (url.hostname === 'boat.dev') {
        if (url.pathname.endsWith('/host')) {
          const body: { port: number } = await request.json()
          return Response.json({
            ok: true,
            type: 'port.hosted',
            port: body.port,
            url: `https://sandbox-${body.port}.on.boat.dev?_token=server-port-token`,
            access: 'private',
            isProtected: true,
          })
        }
        if (url.pathname.endsWith('/desktop')) {
          return Response.json({
            ok: true,
            type: 'desktop.url',
            desktopUrl: `https://sandbox-desktop.on.boat.dev/stream.html?hostId=host&appId=app#token=desktop-${++desktopSequence}`,
          })
        }
        if (url.pathname.endsWith('/commands')) {
          const body: { command: string } = await request.clone().json()
          if (body.command.includes('ss -H -ltn')) {
            return Response.json({
              ok: true,
              type: 'command.finished',
              exitCode: 0,
              stdout: 'LISTEN 0 128 0.0.0.0:3000 0.0.0.0:*\n',
              stderr: '',
              timedOut: false,
            })
          }
          if (body.command.includes('cat /run/conducting-terminal/password')) {
            let password = passwords.get(url.pathname)
            if (!password) {
              password = String(++terminalSequence).padStart(64, 'a')
              passwords.set(url.pathname, password)
            }
            return Response.json({
              ok: true,
              type: 'command.finished',
              exitCode: 0,
              stdout: password + '\n',
              stderr: '',
              timedOut: false,
            })
          }
        }
        return core.boat.fetch(request)
      }
      if (request.headers.get('Upgrade') === 'websocket') {
        const upstream = new TestSocket()
        upstreamSockets.push(upstream)
        return socketResponse(
          upstream,
          request.headers.get('Sec-WebSocket-Protocol') ?? '',
        )
      }
      return new Response('preview content', {
        headers: {
          'Content-Type': 'text/plain',
          'Set-Cookie':
            'shop=green; Domain=sandbox-3000.on.boat.dev; Path=/; Secure',
        },
      })
    },
  }

  const fetch = dependencies.fetch
  return {
    ...core,
    dependencies,
    requests,
    serverSockets,
    upstreamSockets,
    setNow: (value: number) => {
      now = value
      core.setTime(value)
    },
    setResponse: (factory: (() => Response) | null) => {
      response = factory
    },
    resetTools: async () => {
      await core.reset()
      now = TEST_TIME
      requests.length = 0
      serverSockets.length = 0
      upstreamSockets.length = 0
      response = null
      dependencies.fetch = fetch
      desktopSequence = 0
      terminalSequence = 0
      passwords.clear()
    },
    seed: async () => {
      const session = await core.login()
      const org = await core.createOrg(session)
      await storeBoatKey(
        core.env,
        org.id,
        'boat-test-key',
        core.boat.fetch,
        now,
      )
      await core.env.DB.batch([
        core.env.DB.prepare(
          `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch)
           VALUES ('repo-one', ?, 100, 'example/repository', 'main')`,
        ).bind(org.id),
        core.env.DB.prepare(
          `INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, name, branch,
           sandbox_id, state, created_at, updated_at, last_activity_at)
           SELECT 'workspace-one', ?, 'repo-one', creator_user_id, 'Task', 'octocat/task',
           'bx_one', 'ready', ?, ?, ? FROM orgs WHERE id = ?`,
        ).bind(org.id, now, now, now, org.id),
      ])
      const request = (path: string, init: RequestInit = {}) => {
        const headers = new Headers(init.headers)
        headers.set('Cookie', session)
        headers.set('Origin', TEST_ORIGIN)
        if (init.body) headers.set('Content-Type', 'application/json')
        return new Request(`${TEST_ORIGIN}${path}`, { ...init, headers })
      }
      return { session, orgId: org.id, workspaceId: 'workspace-one', request }
    },
    status: async () =>
      core.env.DB.prepare(
        "SELECT last_activity_at AS activity FROM workspaces WHERE id = 'workspace-one'",
      ).first<{ activity: number }>(),
  }
}

export type ToolsHarness = Awaited<ReturnType<typeof createToolsHarness>>
