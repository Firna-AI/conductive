import { expect, it } from 'vitest'

import { COMPUTER_MESSAGE_PART_BYTES } from '../../src/shared/computer'
import type { ComputerOperation } from '../../src/shared/generated/ComputerOperation'
import type { ComputerResult } from '../../src/shared/generated/ComputerResult'
import type { ownComputerClient } from './client'
import { setupOwnComputers } from './fixture.test-support'

const setup = setupOwnComputers()
const container = 'workspace-1'
const image = 'org-image'
const env = [{ name: 'LANG', value: 'C' }]
const release = { version: '0.0.42', digest: 'a'.repeat(64) }
const creation = {
  container,
  image: { kind: 'org' as const, name: image },
  env,
  cpus: 4,
  memoryBytes: 8_589_934_592,
}
const running = { kind: 'container', container, state: 'running' } as const
const stopped = { kind: 'container', container, state: 'stopped' } as const

const cases = [
  {
    operation: { kind: 'container.create', ...creation },
    reply: stopped,
    run: (client) => client.create(creation),
  },
  {
    operation: { kind: 'container.get', container },
    reply: running,
    run: (client) => client.get(container),
  },
  {
    operation: { kind: 'container.start', container, env },
    reply: running,
    run: (client) => client.start(container, env),
  },
  {
    operation: { kind: 'container.stop', container },
    reply: stopped,
    run: (client) => client.stop(container),
  },
  {
    operation: { kind: 'container.delete', container },
    reply: { kind: 'container.deleted', container },
    run: (client) => client.delete(container),
  },
  {
    operation: { kind: 'image.save', container, image },
    reply: { kind: 'image.saved', image },
    run: (client) => client.saveImage(container, image),
  },
  {
    operation: { kind: 'container.bootstrap', container, release },
    reply: { kind: 'container.bootstrapped', container, version: '0.0.42' },
    run: (client) => client.bootstrap(container, release),
  },
] satisfies {
  operation: ComputerOperation
  reply: ComputerResult
  run: (client: ReturnType<typeof ownComputerClient>) => Promise<ComputerResult>
}[]

it.each(cases)(
  'sends and matches $operation.kind through the client',
  async ({ operation, reply, run }) => {
    const f = await setup()
    const added = await f.add()
    const { host } = await added.connect()

    const result = run(added.client)
    const sent = await host.request()
    host.send({ type: 'reply', requestId: sent.requestId, result: reply })
    expect(sent).toEqual({ requestId: 1, operation, parts: 0 })
    await expect(result).resolves.toEqual(reply)
  },
)

it('passes the saved environment name APP.CONFIG to the computer', async () => {
  const f = await setup()
  const added = await f.add()
  const { host } = await added.connect()
  const savedEnv = [{ name: 'APP.CONFIG', value: 'enabled' }]
  const result = added.client.start(container, savedEnv)

  const sent = await Promise.race([
    host.request(),
    result.catch((error: unknown) => error),
  ])
  expect(sent).toEqual({
    requestId: 1,
    operation: { kind: 'container.start', container, env: savedEnv },
    parts: 0,
  })
  host.send({ type: 'reply', requestId: 1, result: running })
  await expect(result).resolves.toEqual(running)
})

it.each([
  {
    reason: 'NUL in an environment value',
    entry: { name: 'CONFIG', value: 'x\0y' },
  },
  {
    reason: 'equals sign in an environment name',
    entry: { name: 'APP=CONFIG', value: 'enabled' },
  },
])(
  'rejects $reason before it allocates a request or sends a frame',
  async ({ entry }) => {
    const f = await setup()
    const added = await f.add()
    const { host } = await added.connect()

    const nextRequest = host.request()
    const invalid = added.client.start(container, [entry])
    await expect(Promise.race([invalid, nextRequest])).rejects.toMatchObject({
      status: 400,
      code: 'invalid_request',
    })
    const result = added.client.get(container)
    const sent = await nextRequest
    host.send({ type: 'reply', requestId: sent.requestId, result: running })
    expect(sent).toEqual({
      requestId: 1,
      operation: { kind: 'container.get', container },
      parts: 0,
    })
    await expect(result).resolves.toEqual(running)
  },
)

it('keeps the connection and advances the request ID after hibernation', async () => {
  const f = await setup()
  const added = await f.add()
  const { host } = await added.connect()

  const first = added.getInWorker(container)
  const request = await host.request()
  host.send({ type: 'reply', requestId: request.requestId, result: running })
  expect(request.requestId).toBe(1)
  await expect(first).resolves.toEqual(running)

  await added.hibernate()
  expect(await added.client.connection()).toEqual({ connected: true })

  const second = added.getInWorker(container)
  const next = await host.request()
  host.send({ type: 'reply', requestId: next.requestId, result: running })
  await expect(second).resolves.toEqual(running)
  expect(next.requestId).toBe(2)
})

it('sends a large operation in binary parts and reads a reply assembled from parts', async () => {
  const f = await setup()
  const added = await f.add()
  const { host } = await added.connect()
  const largeEnv = [
    { name: 'CONFIG', value: '€'.repeat(COMPUTER_MESSAGE_PART_BYTES / 2) },
  ]

  const result = added.client.start(container, largeEnv)
  const sent = await host.request()
  const reply = new TextEncoder().encode(
    JSON.stringify({
      type: 'reply',
      requestId: sent.requestId,
      result: running,
    }),
  )
  host.sendPart(sent.requestId, reply.subarray(0, 7), false)
  host.sendPart(sent.requestId, reply.subarray(7), true)
  expect(sent.parts).toBe(2)
  expect(sent.operation).toEqual({
    kind: 'container.start',
    container,
    env: largeEnv,
  })
  await expect(result).resolves.toEqual(running)
})

it('rejects the wrong container in the reply for a pending request', async () => {
  const f = await setup()
  const added = await f.add()
  const { host } = await added.connect()
  const failure = expect(added.client.get(container)).rejects.toMatchObject({
    status: 502,
    code: 'invalid_response',
  })
  const request = await host.request()
  host.send({
    type: 'reply',
    requestId: request.requestId,
    result: { ...running, container: 'another-container' },
  })
  await failure
})

it('fails pending work on socket drop', async () => {
  const f = await setup()
  const added = await f.add()
  const { host } = await added.connect()
  const failure = expect(added.client.get(container)).rejects.toMatchObject({
    status: 503,
    code: 'computer_disconnected',
  })
  await host.request()
  host.socket.close()
  await failure
})
