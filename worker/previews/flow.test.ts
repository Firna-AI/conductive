import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createPreviewHandler } from './handler'
import { barrier, bodySource, openPreview } from './stream-test-support'
import { createToolsHarness, type ToolsHarness } from './test-support'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(async () => {
  await harness.resetTools()
})
afterAll(async () => {
  await harness.dispose()
})

it('uses HTTP backpressure to read one response chunk only when the browser requests it', async () => {
  const setup = await openPreview(harness)
  const source = bodySource()
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) =>
    new URL(request.url).hostname === 'boat.dev'
      ? base(request)
      : new Response(source.stream)
  const response = await setup.handler.proxy(
    setup.previewRequest(setup.previewUrl),
  )
  expect(source.pulls).toBe(0)
  const reader = response.body?.getReader()
  const requested = source.nextPull()
  const first = reader?.read()
  await requested
  expect(source.pulls).toBe(1)
  source.send('first')
  expect(new TextDecoder().decode((await first)?.value)).toBe('first')
  expect(source.pulls).toBe(1)
  const requestedAgain = source.nextPull()
  const second = reader?.read()
  await requestedAgain
  expect(source.pulls).toBe(2)
  source.send('second')
  expect(new TextDecoder().decode((await second)?.value)).toBe('second')
  await reader?.cancel()
  expect(source.cancelled).toBe(true)
})

it('rechecks preview access after an asynchronous activity callback before opening the upstream', async () => {
  const setup = await openPreview(harness)
  const started = barrier<void>()
  const release = barrier<void>()
  let upstreamCalls = 0
  const base = harness.dependencies.fetch
  const dependencies = {
    ...harness.dependencies,
    fetch: async (request: Request) => {
      if (new URL(request.url).hostname !== 'boat.dev') upstreamCalls++
      return base(request)
    },
    onActivity: async () => {
      started.resolve()
      await release.promise
    },
  }
  const handler = createPreviewHandler(harness.env, dependencies)
  const pending = handler.proxy(setup.previewRequest(setup.previewUrl))
  await started.promise
  await setup.handler.revokeWorkspace(setup.workspaceId)
  release.resolve()
  expect((await pending).status).toBe(404)
  expect(upstreamCalls).toBe(0)
})
