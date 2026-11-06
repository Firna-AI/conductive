import { describe, expect, test } from 'vitest'
import { sectionPath } from '../../shared/sections'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { ApiError, createApiClient } from './client'
import { ignore } from './parse'

describe('createApiClient', () => {
  test('a write sends JSON, also an empty one, and an error keeps its code', async () => {
    const server = new FakeApiServer()
    const api = createApiClient(server.fetch)
    await api.send('DELETE', sectionPath(FAKE_IDS.org, 'infra'), {}, ignore)
    const write = server.requests.at(-1)
    expect(write?.headers.get('Content-Type')).toBe('application/json')
    expect(await write?.text()).toBe('{}')
    const failure = await api
      .get('/api/unknown', ignore)
      .catch((error) => error)
    expect(failure).toBeInstanceOf(ApiError)
    expect(failure).toMatchObject({ status: 404, code: 'fake_route_missing' })
  })
})
