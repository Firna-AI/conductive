import { apiReply } from './operations.test-support.ts'
import type { ScenarioOptions } from './scenario.test-support.ts'

export function scenarioHttp(trace: string[], options: ScenarioOptions) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    const path = url.pathname
    if (url.hostname === 'runner.preview.example') {
      trace.push('runner:public-size')
      return new Response(null, { headers: { 'Content-Length': '123' } })
    }
    if (url.hostname === 'pr-123-app.preview.example') {
      trace.push('health:check')
      return Response.json({ status: 'ok' })
    }
    if (url.hostname === 'boat.dev') {
      if (request.method === 'GET') {
        trace.push('sandbox:list')
        return Response.json({
          ok: true,
          type: 'sandbox.list',
          sandboxes: [
            { id: url.searchParams.has('cursor') ? 'box-b' : 'box-a' },
          ],
          pageInfo: {
            nextCursor: url.searchParams.has('cursor') ? null : 'next',
          },
        })
      }
      if (path.includes('/sandboxes/')) {
        trace.push(`sandbox:delete:${path.split('/').at(-1)}`)
        return new Response(null, {
          status: options.cleanupFailure ? 500 : 404,
        })
      }
      trace.push(`snapshot:delete:${path.split('/').at(-1)}`)
      return new Response(null, { status: 404 })
    }
    if (path.endsWith('/storage/kv/namespaces')) {
      trace.push('registry:find')
      return apiReply(
        options.registryMissing
          ? []
          : [{ id: 'registry-id', title: 'conductive-preview-registry' }],
      )
    }
    if (path.includes('/values/')) {
      trace.push(
        request.method === 'DELETE' ? 'registry:remove' : 'registry:add',
      )
      return request.method === 'DELETE'
        ? new Response(null, { status: 404 })
        : apiReply(null)
    }
    if (path.endsWith('/tokens/verify')) {
      trace.push('storage:auth')
      return apiReply({ id: 'fake-token-id' })
    }
    if (path.endsWith('/workers/scripts/conductive-pr-123')) {
      trace.push('worker:delete')
      return new Response(null, { status: 404 })
    }
    if (path.endsWith('/zones')) {
      trace.push('zone:list')
      return apiReply([{ id: 'zone-id', name: 'preview.example' }])
    }
    if (path.endsWith('/workers/routes')) {
      trace.push('routes:list')
      return apiReply([
        { id: 'route-id', script: 'conductive-pr-123' },
        { id: 'other-id', script: 'keep-this-worker' },
      ])
    }
    if (path.endsWith('/workers/routes/route-id')) {
      trace.push('route:delete')
      return new Response(null, { status: 404 })
    }
    throw new Error('Unexpected fake HTTP request.')
  }
}
