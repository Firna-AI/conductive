import { afterEach, expect, it, vi } from 'vitest'

import { StreamedBody } from '../../github/streamed-body'
import { installationToken, revokeInstallationToken } from './github-app'
import {
  accessFailure,
  keys,
  now,
  privateKey,
  repository,
} from './github-app.test-support'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('uses the supplied clock and bounded shared request policy for image credentials', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const requests: Request[] = []
  await expect(
    installationToken(
      async (request) => {
        requests.push(request.clone())
        return Response.json({ token: 'image-read-token' }, { status: 200 })
      },
      'github-client-id',
      privateKey,
      repository,
      now,
    ),
  ).resolves.toBe('image-read-token')
  expect(requests).toHaveLength(1)
  const request = requests[0]
  expect([request.method, request.url, request.redirect]).toEqual([
    'POST',
    'https://api.github.com/app/installations/701/access_tokens',
    'manual',
  ])
  expect(await request.json()).toEqual({
    repository_ids: [101],
    permissions: { contents: 'read' },
  })
  const [header, claims, signature] = (
    request.headers.get('Authorization')?.slice(7) ?? ''
  ).split('.')
  expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toEqual({
    iat: 1_799_999_940,
    exp: 1_800_000_540,
    iss: 'github-client-id',
  })
  const publicKey = await crypto.subtle.importKey(
    'spki',
    keys.publicKey.export({ type: 'spki', format: 'der' }),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  expect(
    await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      Buffer.from(signature, 'base64url'),
      Buffer.from(`${header}.${claims}`),
    ),
  ).toBe(true)
  await vi.advanceTimersByTimeAsync(30_000)
  expect(request.signal.aborted).toBe(false)
})

it('cancels oversized image token replies and returns the safe image credential error', async () => {
  const body = new StreamedBody(28 * 1024 * 1024)
  await expect(
    installationToken(
      async () => new Response(body.stream, { status: 201 }),
      'github-client-id',
      privateKey,
      repository,
      now,
    ),
  ).rejects.toEqual(accessFailure)
  expect(body.cancelled).toBe(true)
  expect(body.readBytes).toBe(27_328_512)

  for (const response of [
    Response.json({ token: '' }),
    Response.json({ token: 7 }),
    new Response('private-upstream-body', { status: 500 }),
  ])
    await expect(
      installationToken(
        async () => response,
        'github-client-id',
        privateKey,
        repository,
        now,
      ),
    ).rejects.toEqual(accessFailure)
})

it('bounds token revocation and requires a 204 or 401 reply as inactivity proof', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const requests: Request[] = []
  for (const status of [204, 401])
    await expect(
      revokeInstallationToken(async (request) => {
        requests.push(request.clone())
        return new Response(null, { status })
      }, 'private-installation-token'),
    ).resolves.toBeUndefined()
  for (const status of [200, 403, 503])
    await expect(
      revokeInstallationToken(async (request) => {
        requests.push(request.clone())
        return new Response('private-upstream-body', { status })
      }, 'private-installation-token'),
    ).rejects.toEqual(new Error('Installation access could not be revoked'))
  expect(
    requests.map((request) => [request.method, request.url, request.redirect]),
  ).toEqual(
    Array.from({ length: 5 }, () => [
      'DELETE',
      'https://api.github.com/installation/token',
      'manual',
    ]),
  )
  await vi.advanceTimersByTimeAsync(30_000)
  expect(requests.map((request) => request.signal.aborted)).toEqual([
    false,
    false,
    false,
    false,
    false,
  ])
})
