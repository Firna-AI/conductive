import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { readAccount } from '../../src/app/api/read-core'
import { ACCOUNT_PATHS } from '../../src/shared/account'
import { createHarness, type TestHarness } from '../test-support/harness'
import { seedBootIdentity } from './boot-account.test-support'
import {
  favourite,
  favouriteModels,
  otherFavourite,
} from './model-favourites.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.env.CONDUCTIVE_MODELS = JSON.stringify(favouriteModels)
  harness.env.CONDUCTIVE_DEFAULT_CHOICE = JSON.stringify(favourite)
  harness.env.CONDUCTIVE_STARTING_FAVOURITES = JSON.stringify([
    favourite,
    otherFavourite,
  ])
})
afterAll(async () => harness.dispose())

async function account(cookie: string) {
  const response = await harness.request(ACCOUNT_PATHS.account, cookie)
  expect(response.status).toBe(200)
  return readAccount(await response.json())
}

function save(cookie: string, body: unknown) {
  return harness.request(ACCOUNT_PATHS.favourites, cookie, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

it('reads current starting favourites for new accounts and existing preference rows without storing them', async () => {
  const cookie = await harness.login()
  const initial = await account(cookie)
  expect(initial).toMatchObject({ favourites: [favourite, otherFavourite] })
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM user_preferences',
    ).first<number>('count'),
  ).toBe(0)
  await harness.request(ACCOUNT_PATHS.defaultModel, cookie, {
    method: 'PUT',
    body: JSON.stringify({ choice: favourite }),
  })
  harness.env.CONDUCTIVE_STARTING_FAVOURITES = JSON.stringify([otherFavourite])
  expect(await account(cookie)).toMatchObject({
    favourites: [otherFavourite],
    defaultChoice: favourite,
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT model_favourites FROM user_preferences WHERE user_id = ?',
    )
      .bind(initial.user.id)
      .first('model_favourites'),
  ).toBeNull()
})

it('saves ordered full choices, normalizes Fast before duplicates, limits the list, and preserves a saved empty list', async () => {
  const cookie = await harness.login()
  await harness.request(ACCOUNT_PATHS.newWorkspaceView, cookie, {
    method: 'PUT',
    body: JSON.stringify({ view: 'page' }),
  })
  const removedModel = { ...otherFavourite, model: 'removed', effort: 'none' }
  const expected = [
    { ...favourite, fast: true },
    otherFavourite,
    { ...favourite, effort: 'low' },
    removedModel,
    { ...favourite, effort: 'ultra' },
  ]
  const saved = await save(cookie, {
    favourites: [
      { ...favourite, fast: true },
      { ...favourite, fast: true },
      { ...otherFavourite, fast: true },
      otherFavourite,
      { ...favourite, effort: 'low' },
      { ...removedModel, fast: true },
      removedModel,
      { ...favourite, effort: 'ultra', fast: 'true' },
      { ...otherFavourite, effort: 'high' },
    ],
  })
  expect(saved.status).toBe(200)
  expect(await saved.json()).toEqual({ favourites: expected })
  harness.env.CONDUCTIVE_MODELS = '[]'
  harness.env.CONDUCTIVE_STARTING_FAVOURITES = JSON.stringify([otherFavourite])
  expect(await account(cookie)).toMatchObject({
    favourites: expected,
    defaultChoice: favourite,
    newWorkspaceView: 'page',
  })
  const emptied = await save(cookie, { favourites: [] })
  expect(emptied.status).toBe(200)
  expect(await emptied.json()).toEqual({ favourites: [] })
  expect(await account(cookie)).toMatchObject({ favourites: [] })
})

it('rejects malformed bodies and entries without replacing the saved favourites', async () => {
  const cookie = await harness.login()
  expect((await save(cookie, { favourites: [otherFavourite] })).status).toBe(
    200,
  )
  for (const body of [null, []]) {
    const response = await save(cookie, body)
    expect(response.status, JSON.stringify(body)).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'invalid_json' },
    })
  }
  const bodies = [
    {},
    { favourites: null },
    { favourites: {} },
    { favourites: [null] },
    { favourites: [{ ...favourite, agent: 'other' }] },
    { favourites: [{ ...favourite, model: '' }] },
    { favourites: [{ ...favourite, effort: 'other' }] },
    {
      favourites: [
        ...Array.from({ length: 5 }, () => favourite),
        { ...favourite, effort: 'other' },
      ],
    },
  ]
  for (const body of bodies) {
    const response = await save(cookie, body)
    expect(response.status, JSON.stringify(body)).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'invalid_input' },
    })
  }
  expect(await account(cookie)).toMatchObject({ favourites: [otherFavourite] })
})

it('requires models only for fast saves and keeps an account readable when starting favourites have no usable fallback', async () => {
  const cookie = await harness.login()
  await harness.request(ACCOUNT_PATHS.defaultModel, cookie, {
    method: 'PUT',
    body: JSON.stringify({ choice: favourite }),
  })
  delete harness.env.CONDUCTIVE_MODELS
  delete harness.env.CONDUCTIVE_DEFAULT_CHOICE
  expect(await account(cookie)).toMatchObject({ favourites: [] })
  const rejected = await save(cookie, {
    favourites: [{ ...favourite, fast: true }],
  })
  expect(rejected.status).toBe(503)
  expect(await rejected.json()).toMatchObject({
    error: { code: 'models_unavailable' },
  })
  const saved = await save(cookie, { favourites: [otherFavourite] })
  expect(saved.status).toBe(200)
  expect(await saved.json()).toEqual({ favourites: [otherFavourite] })
  expect(await account(cookie)).toMatchObject({ favourites: [otherFavourite] })
})

it('keeps each signed-in account isolated and refuses anonymous reads and writes', async () => {
  const first = await seedBootIdentity(harness)
  const second = await seedBootIdentity(harness, {
    githubId: 8,
    githubLogin: 'other',
    displayName: 'Other',
    avatarUrl: null,
    primaryVerifiedEmail: null,
    githubCreatedAt: null,
  })
  expect((await save(first, { favourites: [otherFavourite] })).status).toBe(200)
  expect(await account(first)).toMatchObject({ favourites: [otherFavourite] })
  expect(await account(second)).toMatchObject({
    favourites: [favourite, otherFavourite],
  })
  expect((await save(second, { favourites: [] })).status).toBe(200)
  expect(await account(first)).toMatchObject({ favourites: [otherFavourite] })
  expect(await account(second)).toMatchObject({ favourites: [] })
  expect((await harness.request(ACCOUNT_PATHS.account, '')).status).toBe(401)
  expect((await save('', { favourites: [] })).status).toBe(401)
  expect(await account(first)).toMatchObject({ favourites: [otherFavourite] })
})

it('reads the starting favourites when the saved list cannot be read', async () => {
  const cookie = await harness.login()
  const initial = await account(cookie)
  await harness.request(ACCOUNT_PATHS.defaultModel, cookie, {
    method: 'PUT',
    body: JSON.stringify({ choice: favourite }),
  })
  for (const stored of ['not json', '{}', '[{"agent":"other"}]']) {
    await harness.env.DB.prepare(
      'UPDATE user_preferences SET model_favourites = ? WHERE user_id = ?',
    )
      .bind(stored, initial.user.id)
      .run()
    expect(await account(cookie), stored).toMatchObject({
      favourites: [favourite, otherFavourite],
    })
  }
})
