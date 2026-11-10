import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { HttpError } from '../http'
import {
  countedUploadReply,
  filePath,
  now,
  uploadBody,
  uploadFixture,
  uploadGrant,
  uploadUrl,
} from './file-write.test-support'
import { paddedBody } from './transport.test-support'

beforeEach(() => vi.spyOn(Date, 'now').mockReturnValue(now))
afterEach(() => vi.restoreAllMocks())

it('accepts grant and transfer replies at exactly the 1 MiB response budget', async () => {
  for (const stage of ['grant', 'transfer'] as const) {
    const bytes =
      stage === 'grant'
        ? paddedBody(uploadGrant(), 1_048_576)
        : new Uint8Array(1_048_576).fill(255)
    const reply = countedUploadReply(bytes)
    const fixture = uploadFixture({
      grantReply: stage === 'grant' ? () => reply.response : undefined,
      transferReply: stage === 'transfer' ? () => reply.response : undefined,
    })
    await expect(
      fixture.client.writeFile('bx_one', filePath, uploadBody().body, 0),
      stage,
    ).resolves.toBeUndefined()
    expect(fixture.requests, stage).toHaveLength(2)
    expect(reply.observed, stage).toEqual({
      pulled: 2,
      bytes: 1_048_576,
      cancelled: 0,
    })
  }
})

it('cancels success and error replies above 1 MiB without exposing their data', async () => {
  for (const stage of ['grant', 'transfer'] as const) {
    for (const status of [200, 429]) {
      const reply = countedUploadReply(
        paddedBody({ ...uploadGrant(), message: uploadUrl }, 1_048_576),
        { status, overflow: true },
      )
      const fixture = uploadFixture({
        grantReply: stage === 'grant' ? () => reply.response : undefined,
        transferReply: stage === 'transfer' ? () => reply.response : undefined,
      })
      const name = `${stage} HTTP ${status}`
      const error: unknown = await fixture.client
        .writeFile('bx_one', filePath, uploadBody().body, 0)
        .catch((error: unknown) => error)
      expect(error, name).toBeInstanceOf(HttpError)
      expect(error, name).toMatchObject({
        status: 502,
        code: 'sandbox_response_too_large',
        message: 'The cloud computer response is too large.',
      })
      expect(reply.observed, name).toEqual({
        pulled: 3,
        bytes: 1_048_577,
        cancelled: 1,
      })
      expect(fixture.requests, name).toHaveLength(stage === 'grant' ? 1 : 2)
    }
  }
})
