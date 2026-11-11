import { expect, it } from 'vitest'
import { waitForHealth } from './health.ts'
import { fakeContext } from './operations.test-support.ts'

it('waits through a failed health reply before accepting a ready app', async () => {
  const { ctx, http, pause } = fakeContext()
  http
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ status: 'ok' }))
  await waitForHealth(ctx, 'https://pr-123-app.preview.example')
  expect(http).toHaveBeenCalledTimes(2)
  expect(pause).toHaveBeenCalledExactlyOnceWith(5000)
  expect(http.mock.calls[0][0].url).toBe(
    'https://pr-123-app.preview.example/api/health',
  )
})

it('fails health after the two-minute logical deadline without registering success', async () => {
  const { ctx, http } = fakeContext()
  http.mockImplementation(async () => new Response(null, { status: 503 }))
  await expect(
    waitForHealth(ctx, 'https://pr-123-app.preview.example'),
  ).rejects.toThrowError(
    'Preview health did not become ready within two minutes.',
  )
  expect(http).toHaveBeenCalledTimes(24)
})
