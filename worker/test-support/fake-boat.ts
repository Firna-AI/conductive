import type { HttpFetch } from '../env'
import type { BoatAccount } from '../sandbox/provider'

export class FakeBoat {
  requests: Request[] = []
  accounts = new Map<string, BoatAccount>([
    ['boat-first', { id: 'team-one', type: 'org' }],
    ['boat-rotated', { id: 'team-one', type: 'org' }],
    ['boat-other', { id: 'team-two', type: 'org' }],
    ['boat-personal', { id: 'user-one', type: 'personal' }],
  ])
  failure: { status: number; code: string } | null = null
  responseOverride: Response | null = null

  fetch: HttpFetch = async (request) => {
    this.requests.push(request.clone())
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
    const key = request.headers.get('Authorization')?.replace('Bearer ', '')
    const account = key ? this.accounts.get(key) : null
    if (!account)
      return Response.json({ ok: false, code: 'unauthorized' }, { status: 401 })
    const path = new URL(request.url).pathname.replace('/api/v1', '')
    if (path === '/orgs') {
      return Response.json({
        ok: true,
        type: 'org.list',
        orgs: [{ ...account, active: true }],
      })
    }
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
