import { expect, it, vi } from 'vitest'

import { configuredStartingFavourites } from './models'
import {
  favourite,
  favouriteModels,
  otherFavourite,
} from './model-favourites.test-support'

const environment = {
  CONDUCTIVE_MODELS: JSON.stringify(favouriteModels),
  CONDUCTIVE_DEFAULT_CHOICE: JSON.stringify({ ...favourite, fast: true }),
}

it('filters malformed and unavailable starting choices, keeps the first five, and warns for each omission', () => {
  const warn = vi.fn()
  const entries = [
    null,
    { ...favourite, model: 'removed' },
    { ...favourite, effort: 'ultra' },
    { ...favourite, agent: 'codex' },
    favourite,
    favourite,
    otherFavourite,
    { ...favourite, effort: 'low' },
    { ...favourite, effort: 'medium' },
    { ...favourite, effort: 'max' },
    { ...otherFavourite, effort: 'low' },
  ]
  expect(
    configuredStartingFavourites(
      {
        ...environment,
        CONDUCTIVE_STARTING_FAVOURITES: JSON.stringify(entries),
      },
      warn,
    ),
  ).toEqual([
    favourite,
    otherFavourite,
    { ...favourite, effort: 'low' },
    { ...favourite, effort: 'medium' },
    { ...favourite, effort: 'max' },
  ])
  expect(warn.mock.calls).toEqual(
    Array.from({ length: 6 }, () => [{ kind: 'starting_favourite_skipped' }]),
  )
})

it('turns unsupported Fast off before it drops exact starting duplicates', () => {
  const warn = vi.fn()
  expect(
    configuredStartingFavourites(
      {
        ...environment,
        CONDUCTIVE_STARTING_FAVOURITES: JSON.stringify([
          { ...otherFavourite, fast: true },
          otherFavourite,
          { ...favourite, fast: true },
          { ...favourite, fast: 'true' },
        ]),
      },
      warn,
    ),
  ).toEqual([otherFavourite, { ...favourite, fast: true }, favourite])
  expect(warn.mock.calls).toEqual([[{ kind: 'starting_favourite_skipped' }]])
})

it.each([
  ['missing', undefined],
  ['empty text', ''],
  ['bad JSON', '{'],
  ['not an array', '{}'],
  ['empty array', '[]'],
  [
    'fully filtered array',
    JSON.stringify([null, { ...favourite, model: 'removed' }]),
  ],
])(
  'uses the standard-speed app default for a %s starting setting',
  (_name, setting) => {
    const warn = vi.fn()
    expect(
      configuredStartingFavourites(
        { ...environment, CONDUCTIVE_STARTING_FAVOURITES: setting },
        warn,
      ),
    ).toEqual([favourite])
    expect(warn).toHaveBeenCalledWith({ kind: 'starting_favourites_fallback' })
  },
)

it('uses the app default when the model list cannot validate starting favourites', () => {
  for (const models of [undefined, '{', '[]']) {
    const warn = vi.fn()
    expect(
      configuredStartingFavourites(
        {
          ...environment,
          CONDUCTIVE_MODELS: models,
          CONDUCTIVE_STARTING_FAVOURITES: JSON.stringify([otherFavourite]),
        },
        warn,
      ),
      models,
    ).toEqual([favourite])
    expect(warn).toHaveBeenCalledWith({ kind: 'starting_favourites_fallback' })
  }
})

it('returns no starting favourites when the fallback app default is unavailable', () => {
  for (const setting of [undefined, '{']) {
    const warn = vi.fn()
    expect(
      configuredStartingFavourites(
        { CONDUCTIVE_DEFAULT_CHOICE: setting },
        warn,
      ),
    ).toEqual([])
    expect(warn).toHaveBeenCalledWith({ kind: 'starting_favourites_fallback' })
  }
})
