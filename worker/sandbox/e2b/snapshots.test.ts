import { expect, it } from 'vitest'

import { E2bClient } from './client'
import { createInput, e2bFixture } from './client.test-support'

const fixture = e2bFixture()

it('recovers one filesystem snapshot and retains its namespaced ID and source across clients', async () => {
  const { client, server, options } = fixture()
  await client.create(createInput)
  server.loseSnapshot = true
  expect(await client.saveSnapshot('sandbox-one', 'org-image')).toEqual({
    name: 'org-image',
    sourceSandboxId: 'sandbox-one',
    status: 'ready',
  })
  expect(await new E2bClient(options).getSnapshot('org-image')).toEqual({
    name: 'org-image',
    sourceSandboxId: 'sandbox-one',
    status: 'ready',
  })
  expect(await client.saveSnapshot('sandbox-one', 'org-image')).toEqual({
    name: 'org-image',
    sourceSandboxId: 'sandbox-one',
    status: 'ready',
  })
  const saves = server.requests.filter(
    (request) =>
      request.method === 'POST' &&
      new URL(request.url).pathname.endsWith('/snapshots'),
  )
  expect(saves).toHaveLength(1)
  expect(server.bodies[server.requests.indexOf(saves[0])]).toEqual({
    name: 'org-image',
    memory: false,
  })
  await client.create({
    ...createInput,
    idempotencyKey: 'request-two',
    snapshotName: 'org-image',
  })
  const creates = server.requests.filter(
    (request) =>
      new URL(request.url).pathname === '/v2/sandboxes' &&
      request.method === 'POST',
  )
  expect(await creates[1].json()).toMatchObject({
    templateID: 'project/org-image:default',
  })
  await client.deleteSnapshot('org-image')
  expect(server.requests.at(-1)?.url).toBe(
    'https://api.eu.e2b.test/templates/project%2Forg-image%3Adefault',
  )
  await expect(client.getSnapshot('org-image')).rejects.toMatchObject({
    kind: 'not_found',
  })
})

it('keeps an ambiguous empty snapshot pending and never submits its mutation again', async () => {
  const { client, server } = fixture()
  await client.create(createInput)
  server.loseSnapshot = true
  const send = server.fetch
  let saves = 0
  const pending = new E2bClient({
    ...fixture().options,
    fetch: async (request) => {
      if (
        request.method === 'POST' &&
        new URL(request.url).pathname.endsWith('/snapshots')
      ) {
        saves++
        throw new Error('lost reply')
      }
      return send(request)
    },
  })
  expect(await pending.saveSnapshot('sandbox-one', 'pending-image')).toEqual({
    name: 'pending-image',
    sourceSandboxId: 'sandbox-one',
    status: 'saving',
  })
  expect(await pending.getSnapshot('pending-image')).toMatchObject({
    status: 'saving',
  })
  expect(
    await pending.saveSnapshot('sandbox-one', 'pending-image'),
  ).toMatchObject({ status: 'saving' })
  expect(saves).toBe(1)
  await expect(pending.deleteSnapshot('pending-image')).rejects.toMatchObject({
    kind: 'unavailable',
  })
})

it('refuses a saved snapshot response that names another image', async () => {
  const { client, server } = fixture()
  await client.create(createInput)
  server.response = () =>
    Response.json(
      {
        snapshotID: 'project/other-image:default',
        names: ['project/other-image'],
      },
      { status: 201 },
    )
  await expect(
    client.saveSnapshot('sandbox-one', 'org-image'),
  ).rejects.toMatchObject({ kind: 'invalid_response', status: 502 })
})
