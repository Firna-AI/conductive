import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { createServer, request } from 'node:http'
import type { RequestOptions } from 'node:https'
import { expect, it } from 'vitest'
import type { ImportUploadTarget } from '../../../src/shared/conductor-import-storage.ts'
import { directImportPut, verifyLocalPart } from './upload.ts'

it('puts exact bytes and issued headers without ambient credentials or redirects', async () => {
  const received: {
    path: string
    bytes: Buffer
    headers: Record<string, string | string[] | undefined>
  }[] = []
  const server = createServer(async (incoming, response) => {
    const chunks: Buffer[] = []
    for await (const chunk of incoming) chunks.push(Buffer.from(chunk))
    received.push({
      path: incoming.url ?? '',
      bytes: Buffer.concat(chunks),
      headers: incoming.headers,
    })
    response.writeHead(received.length === 1 ? 200 : 302, {
      Location: '/do-not-follow',
    })
    response.end()
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Storage fixture did not start')
  const calls: { url: string; options: RequestOptions }[] = []
  const bytes = new Uint8Array([0, 255, 4, 8])
  const part = {
    group: 'work',
    id: 'part-one',
    sizeBytes: 4,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  } as const
  const target: ImportUploadTarget = {
    method: 'PUT',
    url: 'https://private-storage.invalid/exact-path?signature=issued',
    headers: {
      'Content-Length': '4',
      Authorization: 'Issued storage signature',
    },
    expiresAt: 1000,
    identity: {
      scope: { orgId: 'org-one', reservationId: 'reservation-one' },
      part,
      uploadId: 'upload-one',
    },
  }
  const put = directImportPut((url, options, callback) => {
    calls.push({ url: url.href, options })
    return request(
      {
        host: '127.0.0.1',
        port: address.port,
        path: url.pathname + url.search,
        method: options.method,
        headers: options.headers,
        agent: false,
        signal: options.signal,
      },
      callback,
    )
  })
  const signal = new AbortController().signal
  try {
    expect(await put(target, bytes, signal)).toBe(200)
    expect(await put(target, bytes, signal)).toBe(302)
    expect(received).toHaveLength(2)
    expect(
      received.map((entry) => ({
        path: entry.path,
        bytes: [...entry.bytes],
        authorization: entry.headers.authorization,
        cookie: entry.headers.cookie,
      })),
    ).toEqual([
      {
        path: '/exact-path?signature=issued',
        bytes: [0, 255, 4, 8],
        authorization: 'Issued storage signature',
        cookie: undefined,
      },
      {
        path: '/exact-path?signature=issued',
        bytes: [0, 255, 4, 8],
        authorization: 'Issued storage signature',
        cookie: undefined,
      },
    ])
    expect(
      calls.map((call) => ({
        url: call.url,
        method: call.options.method,
        headers: call.options.headers,
        agent: call.options.agent,
      })),
    ).toEqual(
      Array(2).fill({
        url: target.url,
        method: 'PUT',
        headers: target.headers,
        agent: false,
      }),
    )
    await expect(
      put(
        { ...target, url: 'https://ambient:secret@private-storage.invalid/' },
        bytes,
        signal,
      ),
    ).rejects.toMatchObject({ code: 'upload_failed' })
    expect(() => verifyLocalPart(part, new Uint8Array([0, 255, 4, 9]))).toThrow(
      'upload_failed',
    )
    expect(calls).toHaveLength(2)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})
