import { API_PATHS } from '../shared/api'
import { readMoveOrgRequest } from '../shared/orgs'
import type { DevBackend } from '../app/dev/backend'
import { RouteError, type Route } from '../app/dev/router'

export function devOrgOrderRoute(backend: DevBackend): Route {
  return {
    method: 'PUT',
    path: API_PATHS.orgOrder,
    answer: ({ body }) => {
      const move = readMoveOrgRequest(body)
      if (!move)
        throw new RouteError(
          400,
          'invalid_input',
          'Complete the required fields.',
        )
      const { state } = backend
      const visible = state.orgs.filter(
        (item) => !item.org.deletion || item.org.role === 'admin',
      )
      const org = visible.find((item) => item.org.id === move.orgId)
      if (!org)
        throw new RouteError(404, 'org_not_found', 'The org is not available.')
      const remaining = visible.filter((item) => item !== org)
      remaining.splice(Math.min(move.index, remaining.length), 0, org)
      let index = 0
      state.orgs = state.orgs.map((item) =>
        visible.includes(item) ? remaining[index++] : item,
      )
      return new Response(null, { status: 204 })
    },
  }
}
