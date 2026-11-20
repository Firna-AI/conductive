import { expect, it, onTestFinished } from 'vitest'

import { heldOperation } from '../../test-support/held-operation'

import { E2bClient } from './client'
import { createInput, e2bFixture } from './client.test-support'

const fixture = e2bFixture()

it('does not retain a late traffic credential after cleanup deleted the allocation', async () => {
  const { server, options, db } = fixture()
  const gate = heldOperation()
  onTestFinished(gate.release)
  const active = new E2bClient({
    ...options,
    fetch: async (request) => {
      const response = await server.fetch(request)
      if (
        request.method === 'POST' &&
        new URL(request.url).pathname === '/v2/sandboxes'
      ) {
        await gate.wait()
      }
      return response
    },
  })
  const creation = active.create(createInput)
  void creation.catch(() => undefined)
  await gate.entered
  const cleanup = new E2bClient({ ...options, allocationMode: 'cleanup' })
  const identity = await cleanup.create({
    idempotencyKey: createInput.idempotencyKey,
    ttlSeconds: 1800,
  })
  await cleanup.delete(identity.id)
  gate.release()
  await expect(creation).rejects.toMatchObject({ kind: 'not_found' })
  expect(
    await db
      .prepare(
        'SELECT count(*) AS count FROM e2b_traffic_tokens WHERE provider_account = ?',
      )
      .bind(options.accountId)
      .first('count'),
  ).toBe(0)
})

it('does not report a late snapshot response ready after cleanup deleted its mapping', async () => {
  const { server, options } = fixture()
  server.sandboxes.set('sandbox-one', {
    sandboxID: 'sandbox-one',
    state: 'running',
    metadata: {},
  })
  const gate = heldOperation()
  onTestFinished(gate.release)
  const active = new E2bClient({
    ...options,
    fetch: async (request) => {
      const response = await server.fetch(request)
      if (
        request.method === 'POST' &&
        new URL(request.url).pathname.endsWith('/snapshots')
      ) {
        await gate.wait()
      }
      return response
    },
  })
  const saving = active.saveSnapshot('sandbox-one', 'late-result')
  void saving.catch(() => undefined)
  await gate.entered
  await new E2bClient(options).deleteSnapshot('late-result')
  gate.release()
  await expect(saving).rejects.toMatchObject({ kind: 'not_found' })
})
