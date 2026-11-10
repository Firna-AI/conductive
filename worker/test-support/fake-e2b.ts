import type { HttpFetch } from '../env'
import { FakeE2bEnvd } from './fake-e2b-envd'

interface FakeSandbox {
  sandboxID: string
  state: 'running' | 'paused'
  metadata: Record<string, string>
  pauseMode?: 'filesystem'
}

export class FakeE2b {
  readonly envd = new FakeE2bEnvd()
  readonly requests: Request[] = []
  readonly bodies: unknown[] = []
  readonly sandboxes = new Map<string, FakeSandbox>()
  readonly snapshots = new Map<
    string,
    { snapshotID: string; names: string[] }
  >()
  apiKey = 'e2b-test-key'
  domain = 'eu.e2b.test'
  trafficToken = 'private-traffic-token'
  envdToken = 'private-envd-token'
  response: (() => Response) | null = null
  failure: {
    status: number
    code: string
    retry?: number | null
    shouldRetry?: boolean
  } | null = null
  loseCreate = false
  loseSnapshot = false

  fetch: HttpFetch = async (request) => {
    this.requests.push(request.clone())
    if (new URL(request.url).hostname.startsWith('49983-')) {
      this.bodies.push(null)
      if (
        !request.url.startsWith(`https://49983-sandbox-one.${this.domain}/`) ||
        request.headers.get('X-Access-Token') !== this.envdToken ||
        request.headers.has('X-API-Key')
      )
        return new Response(null, { status: 403 })
      return this.envd.fetch(request)
    }
    const bodyText = await request.text()
    const body: unknown = bodyText ? JSON.parse(bodyText) : null
    this.bodies.push(body)
    if (this.response) return this.response()
    if (this.failure) {
      const headers = new Headers()
      if (this.failure.retry !== null)
        headers.set('Retry-After', String(this.failure.retry ?? 3))
      if (this.failure.shouldRetry !== undefined)
        headers.set('Should-Retry', String(this.failure.shouldRetry))
      return Response.json(
        {
          code: this.failure.status,
          error_code: this.failure.code,
          message: this.apiKey,
        },
        { status: this.failure.status, headers },
      )
    }
    if (request.headers.get('X-API-Key') !== this.apiKey)
      return new Response(null, { status: 401 })
    const url = new URL(request.url)
    if (url.origin !== `https://api.${this.domain}`)
      throw new Error('Unexpected E2B origin')
    if (url.pathname === '/v2/sandboxes' && request.method === 'POST') {
      const metadata = readMetadata(body)
      const sandbox: FakeSandbox = {
        sandboxID: 'sandbox-one',
        state: 'running',
        metadata,
      }
      this.sandboxes.set(sandbox.sandboxID, sandbox)
      if (this.loseCreate) throw new Error(`lost ${this.apiKey}`)
      return Response.json(this.access(sandbox), { status: 201 })
    }
    if (url.pathname === '/v2/sandboxes') {
      const metadata = new URLSearchParams(
        url.searchParams.get('metadata') ?? '',
      )
      return Response.json(
        [...this.sandboxes.values()].filter((sandbox) =>
          [...metadata].every(
            ([key, value]) => sandbox.metadata[key] === value,
          ),
        ),
      )
    }
    if (url.pathname === '/snapshots')
      return Response.json(
        [...this.snapshots.entries()]
          .filter(([name]) => name === url.searchParams.get('name'))
          .map(([, value]) => value),
      )
    if (url.pathname.startsWith('/templates/')) {
      const id = decodeURIComponent(url.pathname.slice('/templates/'.length))
      for (const [name, snapshot] of this.snapshots)
        if (snapshot.snapshotID === id) this.snapshots.delete(name)
      return new Response(null, { status: 204 })
    }
    const segments = url.pathname.split('/').filter(Boolean)
    if (segments[0] === 'v2') segments.shift()
    const id = decodeURIComponent(segments[1] ?? '')
    const sandbox = this.sandboxes.get(id)
    if (!sandbox) return new Response(null, { status: 404 })
    if (segments[2] === 'snapshots') {
      const name = readName(body)
      const snapshot = {
        snapshotID: `project/${name}:default`,
        names: [`project/${name}`],
      }
      this.snapshots.set(name, snapshot)
      if (this.loseSnapshot) throw new Error(`lost ${this.apiKey}`)
      return Response.json(snapshot, { status: 201 })
    }
    if (segments[2] === 'pause') {
      sandbox.state = 'paused'
      sandbox.pauseMode = 'filesystem'
      return new Response(null, { status: 204 })
    }
    if (segments[2] === 'connect') {
      sandbox.state = 'running'
      delete sandbox.pauseMode
      return Response.json(this.access(sandbox))
    }
    if (segments[2] === 'timeout') return new Response(null, { status: 204 })
    if (request.method === 'DELETE') {
      this.sandboxes.delete(id)
      return new Response(null, { status: 204 })
    }
    return Response.json({
      ...sandbox,
      envdAccessToken: this.envdToken,
      domain: this.domain,
    })
  }

  private access(sandbox: FakeSandbox) {
    return {
      ...sandbox,
      envdAccessToken: this.envdToken,
      trafficAccessToken: this.trafficToken,
      envdVersion: '0.9.0',
      domain: this.domain,
    }
  }
}

function readMetadata(body: unknown): Record<string, string> {
  if (typeof body !== 'object' || body === null || !('metadata' in body))
    return {}
  const value = body.metadata
  if (typeof value !== 'object' || value === null) return {}
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

function readName(body: unknown): string {
  return typeof body === 'object' &&
    body !== null &&
    'name' in body &&
    typeof body.name === 'string'
    ? body.name
    : 'org-image'
}
