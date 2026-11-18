import { expect, it } from 'vitest'

import { API_PATHS, type ApiErrorBody } from '../shared/api'
import type { OrgsResponse } from '../shared/orgs'
import { FakeApiServer } from './fake-api'

it('keeps a fake org move in subsequent list reads and clamps to the end', async () => {
  const server = new FakeApiServer()
  const read = async () => {
    const body: OrgsResponse = await (await server.fetch(API_PATHS.orgs)).json()
    return body.orgs.map((org) => org.id)
  }
  const before = await read()
  const target = before.at(-1)
  const move = (index: number) =>
    server.fetch(API_PATHS.orgOrder, {
      method: 'PUT',
      body: JSON.stringify({ orgId: target, index }),
    })
  expect((await move(0)).status).toBe(204)
  expect(await read()).toEqual([target, ...before.slice(0, -1)])
  expect((await move(100)).status).toBe(204)
  expect(await read()).toEqual(before)
})

it('refuses invalid and unseen fake org moves without changing the list', async () => {
  const server = new FakeApiServer()
  const before: unknown = await (await server.fetch(API_PATHS.orgs)).json()
  for (const [body, status, code] of [
    [{ orgId: 'missing', index: 0 }, 404, 'org_not_found'],
    [{ orgId: 'acme', index: -1 }, 400, 'invalid_input'],
  ] as const) {
    const response = await server.fetch(API_PATHS.orgOrder, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    expect(response.status).toBe(status)
    const result: ApiErrorBody = await response.json()
    expect(result.error.code).toBe(code)
  }
  expect(await (await server.fetch(API_PATHS.orgs)).json()).toEqual(before)
})
