import { describe, expect, test } from 'vitest'
import {
  operatorOrgPath,
  operatorOrgsPath,
  operatorOverviewPath,
  orgSuspensionPath,
} from '../../shared/operator'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { createBackend, guardScope } from './backend'
import { operatorRoutes } from './operator-routes'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { seedState } from './seed'

/** The fetch of the dev fake with the options of a query string. */
function devFetch(search: string) {
  const backend = createBackend(
    seedState(readDevOptions(search)),
    new FakeWorkspaceEvents([]),
    () => FAKE_TIME + 60_000,
    () => 'unused',
  )
  const fetch = routeFetch(
    operatorRoutes(backend),
    (path, method) => guardScope(backend.state, path, method),
    new FakeApiServer().fetch,
  )
  const send = async (method: string, path: string) => {
    const request = method === 'GET' ? undefined : '{}'
    const response = await fetch(path, { method, body: request })
    const body: unknown = await response.json()
    return { status: response.status, body }
  }
  return { backend, send }
}

describe('the operator routes of the dev fake', () => {
  test('answer only an operator, as the Worker does', async () => {
    const { send } = devFetch('')
    expect(await send('GET', operatorOverviewPath())).toEqual({
      status: 403,
      body: {
        error: {
          code: 'operator_required',
          message: 'Operator access is required.',
        },
      },
    })
  })

  test('find an org by a preview address, and suspend and lift it with the time and the operator', async () => {
    const { backend, send } = devFetch('?operator=1')
    const address = 'https://k7q2m9fz.conductive.page/checkout'
    const found = await send('GET', operatorOrgsPath({ q: address }))
    const id = SAMPLE_IDS.activeOrg
    const suspended = await send('POST', orgSuspensionPath(id))
    const page = await send('GET', operatorOrgPath(id))
    const lifted = await send('DELETE', orgSuspensionPath(id))
    const repeat = await send('DELETE', orgSuspensionPath(id))
    await send('POST', orgSuspensionPath(FAKE_IDS.org))
    const acme = backend.state.orgs.find((org) => org.org.id === FAKE_IDS.org)
    expect({
      found: found.body,
      suspended,
      page: page.body,
      lifted: lifted.body,
      repeat: repeat.body,
      acme: acme?.org.suspension,
    }).toMatchObject({
      found: {
        orgs: [{ id: SAMPLE_IDS.suspendedOrg, match: 'preview-address' }],
        total: 1,
        nextCursor: null,
      },
      suspended: {
        status: 202,
        body: {
          orgId: id,
          suspendedAt: FAKE_TIME + 60_000,
          pendingWorkspaceIds: [
            `${id}-workspace-1`,
            `${id}-workspace-2`,
            `${id}-workspace-3`,
            `${id}-workspace-4`,
          ],
          pendingBuildIds: [`${id}-build-1`, `${id}-build-2`],
        },
      },
      page: {
        suspension: {
          suspendedAt: FAKE_TIME + 60_000,
          operator: { githubId: 1, login: 'calummoore' },
        },
      },
      lifted: { orgId: id, liftedAt: FAKE_TIME + 60_000 },
      repeat: { orgId: id, liftedAt: null },
      acme: { suspendedAt: FAKE_TIME + 60_000 },
    })
  })
})
