import { afterAll, beforeAll, expect, it } from 'vitest'

import { hash, sign } from '../security/crypto'
import {
  createHarness,
  TEST_ORIGIN,
  type TestHarness,
} from '../test-support/harness'
import { deviceInternal } from './internal'
import { DEVICE_INTERNAL_PATH } from './paths'
import { createDeviceProof } from './proof'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('gates internal device calls by exact body, signature domain, expiry, and object identity', async () => {
  const body = {
    target: 'workspace',
    operation: {
      type: 'workspace.validate',
      requestId: 'request',
      tokenHash: 'hash',
    },
  }
  const text = JSON.stringify(body)
  const secret = harness.env.SESSION_SIGNING_KEY
  const proof = await createDeviceProof(body.target, text, secret)
  const request = (value: unknown, credential: string) =>
    new Request(TEST_ORIGIN + DEVICE_INTERNAL_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Conductive-Device-Proof': credential,
      },
      body: JSON.stringify(value),
    })
  await expect(
    deviceInternal(
      request(body, proof),
      harness.env,
      (name) => name === body.target,
    ),
  ).resolves.toEqual(body)
  const sessionProof = await sign(
    {
      target: body.target,
      bodyHash: await hash(text),
      expiresAt: Date.now() + 30_000,
    },
    'session',
    secret,
  )
  const expired = await createDeviceProof(body.target, text, secret, 0)
  for (const [value, credential] of [
    [
      { ...body, operation: { ...body.operation, requestId: 'other-request' } },
      proof,
    ],
    [body, sessionProof],
    [body, expired],
  ] as const) {
    await expect(
      deviceInternal(request(value, credential), harness.env, () => true),
    ).rejects.toMatchObject({ status: 403 })
  }
  await expect(
    deviceInternal(request(body, proof), harness.env, () => false),
  ).rejects.toMatchObject({ status: 403 })
})
