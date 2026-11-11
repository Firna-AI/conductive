import { expect, it } from 'vitest'
import { MACHINE_PATHS } from '../../../src/shared/agent-tools.ts'
import { RAW_BODY, relayFixture, signedRequest } from './relay.test-support.ts'
import { relayFetch } from './worker.ts'

it('rejects a bad signature with the same error as the app and performs no fan-out', async () => {
  const fake = relayFixture()
  const request = new Request(
    `https://preview.example${MACHINE_PATHS.githubWebhook}`,
    {
      method: 'POST',
      body: RAW_BODY,
      headers: { 'X-Hub-Signature-256': `sha256=${'0'.repeat(64)}` },
    },
  )
  const response = await relayFetch(
    request,
    fake.env,
    fake.ctx,
    fake.dependencies,
  )
  expect(response.status).toBe(403)
  expect(await response.json()).toEqual({
    error: {
      code: 'github_signature_invalid',
      message: 'The GitHub signature is not valid.',
    },
  })
  expect(fake.list).not.toHaveBeenCalled()
  expect(fake.send).not.toHaveBeenCalled()
  expect(fake.background).toEqual([])
})

it('authenticates raw bytes, pages valid registry keys, forwards only GitHub headers, and logs failures without bodies', async () => {
  const fake = relayFixture()
  fake.list
    .mockResolvedValueOnce({
      keys: [
        { name: 'pr-1' },
        { name: 'pr-0' },
        { name: 'pr-01' },
        { name: 'other' },
      ],
      list_complete: false,
      cursor: 'next',
    })
    .mockResolvedValueOnce({
      keys: [
        { name: 'pr-2' },
        { name: 'pr-3' },
        { name: 'pr-1' },
        { name: 'pr-4.evil.example' },
      ],
      list_complete: true,
    })
  fake.send.mockImplementation(async (request) => {
    if (new URL(request.url).hostname.startsWith('pr-2-'))
      return new Response('fake-sensitive-response', { status: 503 })
    if (new URL(request.url).hostname.startsWith('pr-3-'))
      throw new Error('fake-sensitive-network-error')
    return new Response(null, { status: 204 })
  })
  const request = await signedRequest()
  const signature = request.headers.get('X-Hub-Signature-256')
  const response = await relayFetch(
    request,
    fake.env,
    fake.ctx,
    fake.dependencies,
  )
  expect(response.status).toBe(202)
  expect(fake.ctx.waitUntil).toHaveBeenCalledTimes(1)
  await Promise.all(fake.background)
  expect(fake.send.mock.calls.map(([sent]) => sent.url).sort()).toEqual([
    'https://pr-1-api.preview.example/v1/github/webhooks',
    'https://pr-2-api.preview.example/v1/github/webhooks',
    'https://pr-3-api.preview.example/v1/github/webhooks',
  ])
  for (const [sent] of fake.send.mock.calls) {
    expect(sent.method).toBe('POST')
    expect(sent.redirect).toBe('manual')
    expect(await sent.text()).toBe(RAW_BODY)
    expect(Object.fromEntries(sent.headers)).toEqual({
      'content-type': 'application/json',
      'user-agent': 'GitHub-Hookshot/fake',
      'x-github-event': 'pull_request',
      'x-github-delivery': 'delivery-123',
      'x-github-hook-id': '7',
      'x-github-hook-installation-target-id': '8',
      'x-github-hook-installation-target-type': 'integration',
      'x-hub-signature-256': signature,
    })
  }
  expect(fake.list.mock.calls[1][0]?.cursor).toBe('next')
  expect(
    fake.warn.mock.calls
      .map(([warning]) => warning)
      .sort((a, b) => String(a.preview).localeCompare(String(b.preview))),
  ).toEqual([
    { kind: 'preview_webhook_delivery_failed', preview: 'pr-2', status: 503 },
    { kind: 'preview_webhook_delivery_failed', preview: 'pr-3', status: null },
  ])
})

it('answers GitHub before the background delivery finishes', async () => {
  const fake = relayFixture()
  fake.list.mockResolvedValue({
    keys: [{ name: 'pr-1' }, { name: 'pr-2' }, { name: 'pr-3' }],
    list_complete: true,
  })
  let release = () => {}
  const pending = new Promise<Response>((resolve) => {
    release = () => resolve(new Response(null, { status: 204 }))
  })
  let signalStarted = () => {}
  const started = new Promise<void>((resolve) => {
    signalStarted = resolve
  })
  let finished = false
  fake.send.mockImplementation(async () => {
    signalStarted()
    const response = await pending
    finished = true
    return response
  })
  const response = await relayFetch(
    await signedRequest(),
    fake.env,
    fake.ctx,
    fake.dependencies,
  )
  expect(response.status).toBe(202)
  await started
  expect(fake.send).toHaveBeenCalledTimes(3)
  expect(finished).toBe(false)
  release()
  await Promise.all(fake.background)
  expect(finished).toBe(true)
})
