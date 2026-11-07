import { expect, it } from 'vitest'

import { HEALTH_PATH } from '../src/shared/health'
import { app } from './app'

it('returns JSON health when the API receives a GET request', async () => {
  const response = await app.fetch(
    new Request(`https://conductive.test${HEALTH_PATH}`),
  )

  expect(response.status).toBe(200)
  expect(response.headers.get('Content-Type')).toBe('application/json')
  const body: unknown = await response.json()
  expect(body).toEqual({ status: 'ok' })
})
