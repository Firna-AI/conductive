import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { ProviderError } from './errors'
import {
  filePath,
  now,
  uploadBody,
  uploadFixture,
  uploadGrant,
  uploadUrl,
} from './file-write.test-support'

beforeEach(() => vi.spyOn(Date, 'now').mockReturnValue(now))
afterEach(() => vi.restoreAllMocks())

it('streams exact binary and empty files through a fixed grant without transfer credentials', async () => {
  const cases = [
    {
      chunks: [
        [0, 255, 128],
        [13, 10, 0, 195],
      ],
      expected: [0, 255, 128, 13, 10, 0, 195],
    },
    { chunks: [], expected: [] },
  ]
  for (const scenario of cases) {
    const source = uploadBody(scenario.chunks)
    const pullsAtRequest: number[] = []
    const fixture = uploadFixture({
      onRequest: () => pullsAtRequest.push(source.observed.pulled),
    })
    await expect(
      fixture.client.writeFile(
        'bx_one',
        filePath,
        source.body,
        scenario.expected.length,
      ),
    ).resolves.toBeUndefined()
    expect(fixture.transferred).toEqual([scenario.expected])
    expect(pullsAtRequest).toEqual([0, 0])
    expect(fixture.requests).toHaveLength(2)
    const [grant, transfer] = fixture.requests
    expect([grant.method, grant.url]).toEqual([
      'POST',
      'https://boat.dev/api/v1/sandboxes/bx_one/files/upload-url',
    ])
    expect(await grant.json()).toEqual({ path: filePath })
    expect(grant.headers.get('Authorization')).toBe('Bearer boat-first')
    expect(grant.headers.get('X-Boat-Org')).toBe('app-org')
    expect(grant.headers.get('Cookie')).toBeNull()
    expect([transfer.method, transfer.url]).toEqual(['PUT', uploadUrl])
    expect(Object.fromEntries(transfer.headers)).toEqual({
      'content-type': 'application/octet-stream',
    })
    expect(transfer).toMatchObject({ credentials: 'omit' })
    expect(transfer.redirect).toBe('manual')
  }
})

it('rejects an unbound or unsafe grant before it reads or transfers file bytes', async () => {
  const invalid = [
    { name: 'different path', path: '/tmp/other.bin' },
    { name: 'relative path', path: 'note.bin' },
    { name: 'download grant', type: 'file.download_url' },
    { name: 'different method', method: 'POST' },
    { name: 'invalid expiry', expiresAt: 'invalid' },
    { name: 'expired grant', expiresAt: '2026-11-08T11:59:59Z' },
    { name: 'insecure URL', url: 'http://file-transfer.example/upload' },
    {
      name: 'URL credentials',
      url: 'https://user:secret@file-transfer.example/upload',
    },
    { name: 'malformed URL', url: 'not a URL' },
  ]
  for (const scenario of invalid) {
    const source = uploadBody([[1, 2, 3]])
    const fixture = uploadFixture({
      grantReply: () => Response.json({ ...uploadGrant(), ...scenario }),
    })
    const error: unknown = await fixture.client
      .writeFile('bx_one', filePath, source.body, 3)
      .catch((error: unknown) => error)
    expect(error, scenario.name).toBeInstanceOf(ProviderError)
    expect(error, scenario.name).toMatchObject({
      kind: 'invalid_response',
      status: 502,
      message: 'The sandbox provider request failed: invalid_response',
      providerCode: null,
    })
    expect(fixture.requests, scenario.name).toHaveLength(1)
    expect(fixture.transferred, scenario.name).toEqual([])
    expect(source.observed, scenario.name).toEqual({ pulled: 0, cancelled: 1 })
  }
})

it('rejects a sandbox route escape before it asks for a grant', async () => {
  const fixture = uploadFixture()
  const source = uploadBody([[1]])
  await expect(
    fixture.client.writeFile('bx_one/../../me', filePath, source.body, 1),
  ).rejects.toMatchObject({ kind: 'invalid_request', status: 400 })
  expect(fixture.requests).toEqual([])
  expect(source.observed).toEqual({ pulled: 0, cancelled: 1 })
})
