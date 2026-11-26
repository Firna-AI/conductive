import { expect, it } from 'vitest'

import { ACCOUNT_PATHS } from '../../shared/account'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { readAccount } from '../api/read-core'
import { accountRoutes } from './account-routes'
import { createBackend } from './backend'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { seedState } from './seed'

function setup() {
  const backend = createBackend(
    seedState(readDevOptions('')),
    new FakeWorkspaceEvents([]),
    () => FAKE_TIME,
    () => 'unused',
  )
  const server = new FakeApiServer()
  const fetch = routeFetch(accountRoutes(backend), () => {}, server.fetch)
  const save = (body: unknown) =>
    fetch(ACCOUNT_PATHS.favourites, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  return { backend, fetch, save }
}

it('saves and reads dev favourites with the Worker normalization and keeps an empty list', async () => {
  const { fetch, save } = setup()
  const selected = {
    agent: 'codex',
    model: 'unlisted',
    effort: 'none',
    fast: false,
  }
  const expected = [
    { agent: 'claude', model: 'Opus 5.5', effort: 'max', fast: true },
    selected,
    { ...selected, effort: 'low' },
    { ...selected, effort: 'medium' },
    { ...selected, effort: 'high' },
  ]
  const response = await save({
    favourites: [
      expected[0],
      { ...selected, fast: true },
      selected,
      ...expected.slice(2),
      { ...selected, effort: 'max' },
      { ...selected, effort: 'ultra' },
    ],
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ favourites: expected })
  expect(
    readAccount(await (await fetch(ACCOUNT_PATHS.account)).json()),
  ).toMatchObject({ favourites: expected })
  const emptied = await save({ favourites: [] })
  expect(emptied.status).toBe(200)
  expect(await emptied.json()).toEqual({ favourites: [] })
  expect(
    readAccount(await (await fetch(ACCOUNT_PATHS.account)).json()),
  ).toMatchObject({ favourites: [] })
})

it('rejects malformed dev favourites without changing the account', async () => {
  const { backend, save } = setup()
  const initial = structuredClone(backend.state.account)
  for (const body of [
    {},
    { favourites: [null] },
    { favourites: [{ agent: 'codex', model: '', effort: 'high' }] },
  ]) {
    const response = await save(body)
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'invalid_input' },
    })
  }
  expect(backend.state.account).toEqual(initial)
})
