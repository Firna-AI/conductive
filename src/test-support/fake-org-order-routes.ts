import { API_PATHS } from '../shared/api'
import { readMoveOrgRequest, type OrgSummary } from '../shared/orgs'
import type { FakeRouteWriter } from './fake-api-routes'

export function fakeOrgOrderRoutes(
  routes: FakeRouteWriter,
  initial: readonly OrgSummary[],
) {
  let orgs = [...initial]
  routes.json('GET', API_PATHS.orgs, { orgs })
  routes.handle('PUT', API_PATHS.orgOrder, async (request) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json(
        {
          error: {
            code: 'invalid_json',
            message: 'The request is not valid JSON.',
          },
        },
        { status: 400 },
      )
    }
    const move = readMoveOrgRequest(body)
    if (!move)
      return Response.json(
        {
          error: {
            code: 'invalid_input',
            message: 'Complete the required fields.',
          },
        },
        { status: 400 },
      )
    const org = orgs.find(
      (item) =>
        item.id === move.orgId && (!item.deletion || item.role === 'admin'),
    )
    if (!org)
      return Response.json(
        {
          error: {
            code: 'org_not_found',
            message: 'The org is not available.',
          },
        },
        { status: 404 },
      )
    orgs = orgs.filter((item) => item.id !== org.id)
    orgs.splice(Math.min(move.index, orgs.length), 0, org)
    routes.json('GET', API_PATHS.orgs, { orgs })
    return new Response(null, { status: 204 })
  })
}
