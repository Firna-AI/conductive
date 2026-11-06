import { describe, expect, test } from 'vitest'
import { API_PATHS } from '../shared/api'
import { FakeApiServer } from '../test-support/fake-api'
import { AppModel } from './app-model'
import { testServices } from './test-kit'

describe('AppModel', () => {
  test('a session that the Worker refuses shows the sign-in, not an error', async () => {
    const server = new FakeApiServer()
    server.json(
      'GET',
      API_PATHS.session,
      { error: { code: 'unauthorized', message: 'Sign in to continue.' } },
      401,
    )
    const app = new AppModel(testServices(server))
    await app.start()
    expect(app.boot.get()).toEqual({ state: 'signed-out' })
  })
})
