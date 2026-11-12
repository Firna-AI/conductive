import { expect, it } from 'vitest'

import { createBackend, guardScope } from '../app/dev/backend'
import { readDevOptions } from '../app/dev/options'
import { orgRoutes } from '../app/dev/org-routes'
import { routeFetch } from '../app/dev/router'
import { seedState } from '../app/dev/seed'
import { API_PATHS } from '../shared/api'
import type { OrgsResponse } from '../shared/orgs'
import { devOrgOrderRoute } from './dev-org-order-route'
import { FakeApiServer } from './fake-api'
import { FAKE_TIME } from './fixtures/core'

it('updates the stateful dev org list when the move route is connected', async () => {
  const server = new FakeApiServer()
  const backend = createBackend(
    seedState(readDevOptions('')),
    server.events,
    () => FAKE_TIME,
    () => 'unused',
  )
  const fetch = routeFetch(
    [devOrgOrderRoute(backend), ...orgRoutes(backend)],
    (path, method) => guardScope(backend.state, path, method),
    server.fetch,
  )
  const read = async () => {
    const body: OrgsResponse = await (await fetch(API_PATHS.orgs)).json()
    return body.orgs.map((org) => org.id)
  }
  expect(await read()).toEqual(['acme', 'futex', 'firna'])
  const move = await fetch(API_PATHS.orgOrder, {
    method: 'PUT',
    body: JSON.stringify({ orgId: 'firna', index: 0 }),
  })
  expect(move.status).toBe(204)
  expect(await read()).toEqual(['firna', 'acme', 'futex'])
})
