import { expect, it } from 'vitest'

import { FakeBoat } from '../test-support/fake-boat'
import { BoatClient } from './boat'

it('sends workspace labels on creation and forks with the app credentials', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, 'app-org')
  const input = {
    labels: { user: 'user-one', repository: 'repo-one', workspace: 'task-one' },
    env: { WORKSPACE_TOKEN: 'workspace-token' },
    ttlSeconds: 1800,
    idempotencyKey: 'workspace-create',
  }
  await client.create(input)
  await client.fork('bx_one', {
    ...input,
    idempotencyKey: 'workspace-fork',
  })
  for (const request of server.requests) {
    expect(await request.json()).toEqual({
      labels: {
        user: 'user-one',
        repository: 'repo-one',
        workspace: 'task-one',
      },
      env: { WORKSPACE_TOKEN: 'workspace-token' },
      type: 'default',
      noEnv: true,
      ttlSeconds: 1800,
    })
    expect(request.headers.get('Authorization')).toBe('Bearer boat-first')
    expect(request.headers.get('X-Boat-Org')).toBe('app-org')
  }
  expect(server.requests).toHaveLength(2)
  expect(server.requests[0].headers.get('Idempotency-Key')).toBe(
    'workspace-create',
  )
  expect(server.requests[1].headers.get('Idempotency-Key')).toBe(
    'workspace-fork',
  )
})
