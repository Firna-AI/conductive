import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { StreamedBody } from './streamed-body'
import {
  createGitHubHarness,
  MACHINE_ORIGIN,
  WEBHOOK_SECRET,
  type GitHubTestHarness,
} from './test-harness'
import { handleGitHubWebhook } from './webhook'

let harness: GitHubTestHarness
beforeAll(async () => {
  harness = await createGitHubHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.base.dispose()
})

function deliver(body: StreamedBody, signature: string | null) {
  const headers = new Headers({ 'Content-Length': '1' })
  if (signature !== null) headers.set('X-Hub-Signature-256', signature)
  const init = { method: 'POST', body: body.stream, duplex: 'half', headers }
  return handleGitHubWebhook(
    new Request(`${MACHINE_ORIGIN}${MACHINE_PATHS.githubWebhook}`, init),
    {
      DB: harness.env.DB,
      MACHINE_ORIGIN,
      GITHUB_WEBHOOK_SECRET: WEBHOOK_SECRET,
    },
    { now: () => 1800000000000, refresh: harness.refresh },
  )
}

it('rejects missing and malformed signatures before reading the body', async () => {
  for (const signature of [null, 'sha256=not-a-signature']) {
    const body = new StreamedBody(64 * 1024)
    const response = await deliver(body, signature)
    expect(response.status).toBe(403)
    expect(body.readBytes, signature ?? 'missing signature').toBe(0)
  }
  expect(harness.tokens).toEqual([])
})

it('cancels webhook bytes above 26 MiB despite a smaller content length', async () => {
  const body = new StreamedBody(28 * 1024 * 1024)
  const response = await deliver(body, `sha256=${'0'.repeat(64)}`)
  expect(response.status).toBe(413)
  expect(await response.json()).toEqual({
    error: {
      code: 'github_webhook_too_large',
      message: 'The GitHub webhook is too large.',
    },
  })
  expect(body.readBytes).toBe(27_328_512)
  expect(body.cancelled).toBe(true)
  expect(harness.tokens).toEqual([])
  expect(
    await harness.env.DB.prepare(
      'SELECT count(*) AS count FROM github_webhook_deliveries',
    ).first('count'),
  ).toBe(0)
})
