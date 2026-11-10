import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { BoatClient } from './boat'
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

it('refuses grant and transfer redirects without following their target', async () => {
  for (const stage of ['grant', 'transfer'] as const) {
    const redirect = () =>
      new Response(`private ${uploadUrl}`, {
        status: 307,
        headers: { Location: 'https://other.example/receive' },
      })
    const fixture = uploadFixture({
      grantReply: stage === 'grant' ? redirect : undefined,
      transferReply: stage === 'transfer' ? redirect : undefined,
    })
    await expect(
      fixture.client.writeFile('bx_one', filePath, uploadBody([[1]]).body, 1),
      stage,
    ).rejects.toMatchObject({
      kind: 'unavailable',
      status: 307,
      message: 'The sandbox provider request failed: unavailable',
      providerCode: null,
    })
    expect(fixture.requests, stage).toHaveLength(stage === 'grant' ? 1 : 2)
    expect(
      fixture.requests.map((request) => request.redirect),
      stage,
    ).toEqual(stage === 'grant' ? ['manual'] : ['manual', 'manual'])
  }
})

it('keeps grant, transfer, and network failures typed without exposing signed URLs', async () => {
  const cases = [
    {
      name: 'grant refusal',
      options: {
        grantReply: () =>
          Response.json(
            { code: 'file_write_refused', message: uploadUrl },
            { status: 403 },
          ),
      },
      expected: {
        kind: 'forbidden',
        status: 403,
        providerCode: 'file_write_refused',
        retryAfterSeconds: null,
      },
    },
    {
      name: 'transfer refusal',
      options: {
        transferReply: () =>
          Response.json(
            { code: uploadUrl, message: uploadUrl },
            { status: 429, headers: { 'Retry-After': '3' } },
          ),
      },
      expected: {
        kind: 'rate_limited',
        status: 429,
        providerCode: null,
        retryAfterSeconds: 3,
      },
    },
    {
      name: 'grant network failure',
      options: { failAt: 'grant' as const },
      expected: {
        kind: 'unavailable',
        status: 503,
        providerCode: null,
        retryAfterSeconds: null,
      },
    },
    {
      name: 'transfer network failure',
      options: { failAt: 'transfer' as const },
      expected: {
        kind: 'unavailable',
        status: 503,
        providerCode: null,
        retryAfterSeconds: null,
      },
    },
  ]
  for (const scenario of cases) {
    const fixture = uploadFixture(scenario.options)
    const error: unknown = await fixture.client
      .writeFile('bx_one', filePath, uploadBody([[1]]).body, 1)
      .catch((error: unknown) => error)
    expect(error, scenario.name).toBeInstanceOf(ProviderError)
    expect(error, scenario.name).toMatchObject({
      ...scenario.expected,
      message: `The sandbox provider request failed: ${scenario.expected.kind}`,
    })
    expect(JSON.stringify(error), scenario.name).not.toContain(uploadUrl)
    expect(JSON.stringify(error), scenario.name).not.toContain('boat-first')
  }
})

it('fails safely when the complete declared source was not transferred', async () => {
  const cases = [
    { name: 'short source', sizeBytes: 4 },
    { name: 'long source', sizeBytes: 2 },
    {
      name: 'broken source',
      sizeBytes: 4,
      failure: new Error(`private ${uploadUrl}`),
    },
    { name: 'early transfer success', sizeBytes: 3, consumeTransfer: false },
  ]
  for (const scenario of cases) {
    const fixture = uploadFixture({ consumeTransfer: scenario.consumeTransfer })
    const source = uploadBody([[0, 255, 128]], scenario.failure)
    await expect(
      fixture.client.writeFile(
        'bx_one',
        filePath,
        source.body,
        scenario.sizeBytes,
      ),
      scenario.name,
    ).rejects.toMatchObject({
      kind: 'unavailable',
      status: 503,
      message: 'The sandbox provider request failed: unavailable',
      providerCode: null,
    })
    expect(fixture.transferred, scenario.name).toEqual([])
  }
  for (const outcome of ['early response', 'failure']) {
    const source = uploadBody([[0, 255], [128], [13, 10, 0]])
    const observed: {
      reader?: ReadableStreamDefaultReader<Uint8Array>
      firstBytes: number[]
      locked: boolean
    } = { firstBytes: [], locked: false }
    const client = new BoatClient(
      'boat-first',
      async (request) => {
        if (request.method === 'POST') return Response.json(uploadGrant())
        const reader = request.body?.getReader()
        if (!reader) throw new Error('Missing transfer body')
        observed.reader = reader
        const chunk = await reader.read()
        observed.firstBytes = [...(chunk.value ?? [])]
        observed.locked = request.body?.locked ?? false
        if (outcome === 'failure') throw new Error('Transfer interrupted')
        return new Response(null, { status: 204 })
      },
      'app-org',
    )
    try {
      await expect(
        client.writeFile('bx_one', filePath, source.body, 6),
        outcome,
      ).rejects.toMatchObject({
        kind: 'unavailable',
        status: 503,
        message: 'The sandbox provider request failed: unavailable',
        providerCode: null,
      })
      expect(observed.firstBytes, outcome).toEqual([0, 255])
      expect(observed.locked, outcome).toBe(true)
      expect(source.observed, outcome).toEqual({ pulled: 1, cancelled: 1 })
    } finally {
      observed.reader?.releaseLock()
    }
  }
})
