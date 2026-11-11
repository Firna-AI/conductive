// @vitest-environment happy-dom
import { captureException, flush } from '@sentry/react'
import { expect, it } from 'vitest'

import { API_PATHS } from '../shared/api'
import { FakeApiServer } from '../test-support/fake-api'
import { fakeUser, fakeUsers } from '../test-support/fixtures/core'
import { waitingUser } from '../test-support/fixtures/waitlist'
import { serveWaiting } from '../test-support/waitlist'
import { AppModel } from './app-model'
import {
  browserFailure,
  browserReporter,
  registerBrowserBundle,
  sentEvent,
} from './error-reporting.test-support'
import { HeldRequests, testServices } from './test-kit'

it('reports only the current signed-in Conductive ID and clears it through loading, sign-out, and a late session answer', async () => {
  registerBrowserBundle()
  const { reporting, sent } = browserReporter()
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const app = new AppModel(
    testServices(server, {
      fetch: held.fetch,
      errorReporting: reporting.identity,
    }),
  )
  const capture = async () => {
    captureException(browserFailure())
    await flush()
  }
  await app.start()
  await capture()
  expect(sentEvent(sent[0]).event).toMatchObject({ user: { id: fakeUser.id } })

  serveWaiting(server)
  await app.start()
  await capture()
  expect(sentEvent(sent[1]).event).toMatchObject({
    user: { id: waitingUser.id },
  })

  await app.account.signOut()
  await capture()
  expect(sentEvent(sent[2]).event).not.toHaveProperty('user')

  server.json('GET', API_PATHS.session, { user: fakeUsers[1], appAccess: true })
  held.holdAnswer('GET', API_PATHS.session)
  const pending = app.start()
  await capture()
  expect(sentEvent(sent[3]).event).not.toHaveProperty('user')
  await app.account.signOut()
  held.release('GET', API_PATHS.session)
  await pending
  await capture()
  expect(app.boot.get()).toEqual({ state: 'signed-out' })
  expect(sentEvent(sent[4]).event).not.toHaveProperty('user')

  await app.start()
  await capture()
  expect(sentEvent(sent[5]).event).toMatchObject({
    user: { id: fakeUsers[1].id },
  })
  server.json(
    'GET',
    API_PATHS.session,
    { error: { code: 'unauthorized', message: 'private-refusal' } },
    401,
  )
  await app.start()
  await capture()
  expect(sentEvent(sent[6]).event).not.toHaveProperty('user')
  expect(String(sent.map((request) => request.init.body))).not.toContain(
    fakeUser.githubLogin,
  )
  expect(String(sent.map((request) => request.init.body))).not.toContain(
    waitingUser.githubLogin,
  )
  await reporting.close()
})

it('keeps session behavior when the identity reporter throws', async () => {
  const server = new FakeApiServer()
  const app = new AppModel(
    testServices(server, {
      errorReporting: {
        setUser: () => {
          throw new Error('private-report-failure')
        },
      },
    }),
  )
  await expect(app.start()).resolves.toBeUndefined()
  expect(app.boot.get()).toEqual({ state: 'ready', user: fakeUser })
  await expect(app.account.signOut()).resolves.toBeUndefined()
  expect(app.boot.get()).toEqual({ state: 'signed-out' })
})
