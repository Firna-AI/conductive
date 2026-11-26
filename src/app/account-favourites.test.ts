import { expect, test } from 'vitest'
import type { AgentChoice } from '../shared/generated/AgentChoice'
import { ACCOUNT_PATHS } from '../shared/account'
import { FakeApiServer } from '../test-support/fake-api'
import { AppModel } from './app-model'
import { flushMicrotasks, HeldRequests, testServices } from './test-kit'

const opusMaxFast: AgentChoice = {
  agent: 'claude',
  model: 'Opus 5.5',
  effort: 'max',
  fast: true,
}

const solHigh: AgentChoice = {
  agent: 'codex',
  model: 'GPT-6.1 Sol',
  effort: 'high',
  fast: false,
}

test('a save of the favourites shows the list of the reply, and a failed save keeps the saved list and fails with its error', async () => {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const app = new AppModel(testServices(server, { fetch: held.fetch }))
  await app.start()
  const favourites = () => app.account.account.get()?.favourites
  const loaded = favourites()
  // The Worker keeps the first of two equal favourites, so its reply holds
  // one Opus 5.5 Max Fast.
  server.json('PUT', ACCOUNT_PATHS.favourites, {
    favourites: [opusMaxFast, solHigh],
  })
  held.holdAnswer('PUT', ACCOUNT_PATHS.favourites)
  const save = app.account.setFavourites([opusMaxFast, opusMaxFast, solHigh])
  await flushMicrotasks()
  const whileSaving = favourites()
  held.release('PUT', ACCOUNT_PATHS.favourites)
  await save
  const sent = await server.requests.at(-1)?.json()
  const saved = favourites()
  server.json(
    'PUT',
    ACCOUNT_PATHS.favourites,
    { error: { code: 'internal_error', message: 'Try again.' } },
    503,
  )
  const failed = app.account.setFavourites([])
  await expect(failed).rejects.toMatchObject({
    status: 503,
    code: 'internal_error',
  })
  expect({ whileSaving, sent, saved, afterFailure: favourites() }).toEqual({
    whileSaving: loaded,
    sent: { favourites: [opusMaxFast, opusMaxFast, solHigh] },
    saved: [opusMaxFast, solHigh],
    afterFailure: [opusMaxFast, solHigh],
  })
})
