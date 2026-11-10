import { expect, it } from 'vitest'

import { errorResponse, HttpError } from '../http'
import { FakeBoat } from '../test-support/fake-boat'
import { BoatClient } from './boat'
import { ProviderError } from './errors'
import { fileResponseBudget } from './file-response'
import { countedReply, paddedBody } from './transport.test-support'

const path = '/home/user/note.txt'

function fileInfoBody(size: number) {
  return {
    ok: true,
    type: 'file.info',
    name: 'note.txt',
    path,
    isDir: false,
    isSymlink: false,
    size,
    mode: '0644',
    modifiedAt: '2026-11-07T00:00:00Z',
  }
}

function fileInfo(size: number): Response {
  return Response.json(fileInfoBody(size))
}

it('reports the metadata size above the caller limit after small content refusals', async () => {
  const refusals = [
    {
      name: 'HTTP 400 JSON refusal',
      response: () =>
        Response.json(
          { ok: false, message: 'private boat-first credential' },
          { status: 400 },
        ),
    },
    {
      name: 'HTTP 502 unknown refusal',
      response: () => Response.json({ unexpected: 'refusal' }, { status: 502 }),
    },
    {
      name: 'unsuccessful HTTP 200 file reply',
      response: () =>
        Response.json({
          ok: true,
          type: 'file.read',
          success: false,
          path,
          encoding: 'base64',
          size: 0,
          content: '',
        }),
    },
  ]
  for (const refusal of refusals) {
    const server = new FakeBoat()
    server.responseFactories = [refusal.response, () => fileInfo(6_291_456)]
    const client = new BoatClient('boat-first', server.fetch, 'app-org')
    await expect(
      client.readFile('bx_one', path, 3),
      refusal.name,
    ).resolves.toEqual({
      kind: 'too_large',
      sizeBytes: 6_291_456,
      limitBytes: 3,
    })
  }
})

it('keeps a safe read failure after overflow when metadata is at or below the limit', async () => {
  for (const size of [3, 2]) {
    const budget = fileResponseBudget(path, 3)
    const reply = countedReply(
      paddedBody(
        {
          ok: true,
          type: 'file.read',
          success: true,
          path,
          encoding: 'base64',
          size: 3,
          content: 'YWJj',
        },
        budget,
      ),
      { overflow: true },
    )
    reply.server.responseFactories.push(() => fileInfo(size))
    const error: unknown = await reply.client
      .readFile('bx_one', path, 3)
      .catch((error: unknown) => error)
    expect(error, `metadata size ${size}`).toBeInstanceOf(ProviderError)
    expect(error, `metadata size ${size}`).toMatchObject({
      kind: 'invalid_response',
      status: 502,
      message: 'The sandbox provider request failed: invalid_response',
      providerCode: null,
      retryAfterSeconds: null,
    })
    expect(reply.observed, `metadata size ${size}`).toEqual({
      pulled: 2,
      bytes: budget + 1,
      cancelled: 1,
    })
  }
})

it('keeps HTTP 502 when a small content refusal is followed by a metadata reply above 1 MiB', async () => {
  const reply = countedReply(paddedBody(fileInfoBody(6_291_456), 1_048_576), {
    overflow: true,
  })
  reply.server.responseFactories.unshift(() =>
    Response.json(
      {
        ok: false,
        code: 'file_missing',
        message: 'private boat-first credential',
      },
      { status: 404 },
    ),
  )
  const error: unknown = await reply.client
    .readFile('bx_one', path, 3)
    .catch((error: unknown) => error)
  expect(error).toBeInstanceOf(HttpError)
  const response = errorResponse(error)
  expect(response.status).toBe(502)
  expect(await response.json()).toEqual({
    error: {
      code: 'sandbox_response_too_large',
      message: 'The cloud computer response is too large.',
    },
  })
  expect(reply.observed).toEqual({
    pulled: 2,
    bytes: 1_048_577,
    cancelled: 1,
  })
  expect(reply.server.requests).toHaveLength(2)
})

it('refuses a relative reply for another path', async () => {
  const server = new FakeBoat()
  server.responseFactories = [
    () =>
      Response.json({
        ok: true,
        type: 'file.read',
        success: true,
        path: 'other.txt',
        encoding: 'base64',
        size: 2,
        content: btoa('hi'),
      }),
    () => fileInfo(2),
  ]
  const client = new BoatClient('boat-first', server.fetch, 'app-org')
  await expect(client.readFile('bx_one', path, 3)).rejects.toMatchObject({
    kind: 'invalid_response',
  })
})
