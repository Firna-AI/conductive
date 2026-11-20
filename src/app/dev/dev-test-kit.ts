import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { createBackend, guardScope } from './backend'
import { operatorRoutes } from './operator-routes'
import { readDevOptions } from './options'
import { orgRoutes } from './org-routes'
import { routeFetch } from './router'
import { seedState } from './seed'

/**
 * The fetch of the dev fake with the options of a query string, with its
 * operator routes and its org routes. The clock stays a minute after the
 * time of the samples, unless `clock` gives the time of each read.
 */
export function devFetch(search: string, clock = () => FAKE_TIME + 60_000) {
  const backend = createBackend(
    seedState(readDevOptions(search)),
    new FakeWorkspaceEvents([]),
    clock,
    () => 'unused',
  )
  const fetch = routeFetch(
    [...operatorRoutes(backend), ...orgRoutes(backend)],
    (path, method) => guardScope(backend.state, path, method),
    new FakeApiServer().fetch,
  )
  const send = async (method: string, path: string, fields: object = {}) => {
    const request = method === 'GET' ? undefined : JSON.stringify(fields)
    const response = await fetch(path, { method, body: request })
    const body: unknown = await response.json()
    return { status: response.status, body }
  }
  return { backend, send }
}
