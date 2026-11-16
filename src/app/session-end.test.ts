import { describe, expect, test } from 'vitest'
import { API_PATHS } from '../shared/api'
import { GET_STARTED_PATH } from '../shared/onboarding'
import { workspacePath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { AppModel } from './app-model'
import { ApiError } from './api/client'
import { ignore } from './api/parse'
import { testServices } from './test-kit'

const org = FAKE_IDS.org
const detailPath = workspacePath(org, FAKE_IDS.workspace)

/** The body of the Worker's refusal of a request without a sign-in. */
const signInRequired = {
  error: {
    code: 'sign_in_required',
    message: 'Sign in with GitHub to continue.',
  },
}

/** An app that opened, whose server then answers `path` with `body`. */
async function openApp(path: string, body: unknown, status: number) {
  const server = new FakeApiServer()
  const app = new AppModel(testServices(server))
  await app.start()
  const before = app.boot.get().state
  server.json('GET', path, body, status)
  return { app, before }
}

describe('a sign-in session that ends while the app is open', () => {
  test('a refused request of the app shows the sign-in, and the caller still gets the error', async () => {
    const { app, before } = await openApp(GET_STARTED_PATH, signInRequired, 401)
    const failure = await app.refreshGetStarted().catch((error) => error)
    expect({ before, after: app.boot.get(), failure }).toEqual({
      before: 'ready',
      after: { state: 'signed-out' },
      failure: new ApiError(
        401,
        'sign_in_required',
        'Sign in with GitHub to continue.',
      ),
    })
  })

  test('a refused request of an org shows the sign-in, also through the fetch of its feature clients', async () => {
    const viaClient = await openApp(detailPath, signInRequired, 401)
    await viaClient.app
      .org(org)
      .services.api.get(detailPath, ignore)
      .catch(() => undefined)
    const viaFetch = await openApp(detailPath, signInRequired, 401)
    const reply = await viaFetch.app.org(org).services.api.fetch(detailPath)
    expect({
      client: viaClient.app.boot.get(),
      fetch: viaFetch.app.boot.get(),
      // The feature client still reads the body of the reply.
      body: await reply.json(),
    }).toEqual({
      client: { state: 'signed-out' },
      fetch: { state: 'signed-out' },
      body: signInRequired,
    })
  })

  test('a Sign out after the session ended shows the sign-in', async () => {
    const server = new FakeApiServer()
    const app = new AppModel(testServices(server))
    await app.start()
    server.json('POST', API_PATHS.signOut, signInRequired, 401)
    await app.account.signOut().catch(() => undefined)
    expect(app.boot.get()).toEqual({ state: 'signed-out' })
  })

  test('another refusal with 401, such as an expired GitHub access, keeps the app open', async () => {
    const expired = {
      error: {
        code: 'github_reconnect_required',
        message: 'GitHub access expired. Sign in with GitHub again.',
      },
    }
    const { app } = await openApp(GET_STARTED_PATH, expired, 401)
    await app.refreshGetStarted().catch(() => undefined)
    expect(app.boot.get().state).toBe('ready')
  })
})
