import type { HttpFetch } from '../env'

export class FakeBoat {
  requests: Request[] = []
  apiKey = 'boat-first'
  orgId = 'app-org'
  activeOrgId = 'other-org'
  failure: { status: number; code: string } | null = null
  responseOverride: Response | null = null
  /** One-shot factories return fresh bodies without clone/tee buffering. */
  responseFactories: ((request: Request) => Response)[] = []
  private readonly accountKeys = new Map<string, string>()

  addAccount(account: { orgId: string; apiKey: string }) {
    this.accountKeys.set(account.orgId, account.apiKey)
  }

  reset() {
    this.requests = []
    this.failure = null
    this.responseOverride = null
    this.responseFactories = []
  }

  fetch: HttpFetch = async (request) => {
    this.requests.push(request.clone())
    const destination = request.headers.get('X-Boat-Org') ?? this.activeOrgId
    const apiKey =
      destination === this.orgId
        ? this.apiKey
        : this.accountKeys.get(destination)
    if (apiKey === undefined)
      return Response.json({ ok: false, code: 'not_found' }, { status: 404 })
    const factory = this.responseFactories.shift()
    if (factory) return factory(request)
    if (this.responseOverride) return this.responseOverride.clone()
    if (this.failure) {
      return Response.json(
        {
          ok: false,
          code: this.failure.code,
          message: `Refused ${request.headers.get('Authorization')}`,
        },
        { status: this.failure.status, headers: { 'Retry-After': '3' } },
      )
    }
    if (request.headers.get('Authorization') !== `Bearer ${apiKey}`)
      return Response.json({ ok: false, code: 'unauthorized' }, { status: 401 })
    const path = new URL(request.url).pathname.replace('/api/v1', '')
    if (path.startsWith('/saved-snapshots')) {
      return Response.json({
        ok: true,
        type: 'snapshot.saved.info',
        snapshot: {
          name: 'org-image',
          sourceSandboxId: 'bx_one',
          status: 'ready',
        },
      })
    }
    if (path.endsWith('/commands')) {
      return Response.json({
        ok: true,
        type: 'command.finished',
        exitCode: 0,
        stdout: 'done\n',
        stderr: '',
        timedOut: false,
      })
    }
    return Response.json({
      ok: true,
      type: 'sandbox.info',
      sandbox: { id: 'bx_one', state: 'ready' },
    })
  }
}
