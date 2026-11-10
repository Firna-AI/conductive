import { describe, expect, test } from 'vitest'
import { ACCOUNT_PATHS } from '../../shared/account'
import { sectionPath } from '../../shared/sections'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../../test-support/fixtures/core'
import { ApiError, createApiClient } from './client'
import { ignore } from './parse'
import { readAccount } from './read-core'

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

  test('the account reader keeps shortcut changes from the reply', async () => {
    const server = new FakeApiServer()
    const api = createApiClient(server.fetch)
    const shortcuts = {
      mac: [{ command: 'command-palette', keys: ['Meta+P'] }],
      other: [],
    }
    server.json('GET', ACCOUNT_PATHS.account, {
      ...coreFixtures().account,
      shortcuts,
    })
    expect(await api.get(ACCOUNT_PATHS.account, readAccount)).toMatchObject({
      shortcuts,
    })
  })

  test('an account with missing or invalid preferences is an ApiError', async () => {
    const server = new FakeApiServer()
    const api = createApiClient(server.fetch)
    for (const fields of [
      { newWorkspaceView: undefined },
      { newWorkspaceView: 'drawer' },
      { shortcuts: undefined },
      { shortcuts: { mac: [], other: null } },
    ]) {
      server.json('GET', ACCOUNT_PATHS.account, {
        ...coreFixtures().account,
        ...fields,
      })
      const error = await api
        .get(ACCOUNT_PATHS.account, readAccount)
        .catch((error: unknown) => error)
      expect(error).toBeInstanceOf(ApiError)
      expect(error).toMatchObject({ status: 200, code: 'invalid_response' })
    }
  })
})
