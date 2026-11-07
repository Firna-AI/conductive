import { expect, it, vi } from 'vitest'

import { MemoryWorkspace } from './memory-workspace'
import { sqliteSnapshot } from './sqlite-fixtures.test-support'

it('commits and replays a delivery whose check list fits once but exceeds the receipt limit twice', async () => {
  const snapshot = sqliteSnapshot(true)
  const event = {
    type: 'github.updated',
    banner: snapshot.banner,
    checks: snapshot.checks,
  }
  const identity = {
    workspaceId: 'workspace-1',
    eventNumber: 1,
    occurredAt: 1800000000000,
  }
  const limit = 2 * 1024 * 1024
  const bytes = (value: unknown) =>
    new TextEncoder().encode(JSON.stringify(value)).byteLength
  expect(bytes(snapshot)).toBeLessThan(limit)
  expect(bytes({ snapshot, envelope: { ...identity, event } })).toBeGreaterThan(
    limit,
  )

  const memory = new MemoryWorkspace('workspace-1')
  memory.valueByteLimit = limit
  const read = vi.fn(async () => snapshot)
  const authorize = async () => undefined
  await expect(
    memory.state.refresh(read, authorize, { deliveryId: 'large' }),
  ).resolves.toEqual(snapshot)
  expect(memory.values.get('github:delivery:large')).toEqual({
    snapshot,
    envelope: identity,
  })
  expect(memory.events).toEqual([{ ...identity, event }])
  expect(memory.published).toEqual([{ ...identity, event }])

  memory.restart()
  await expect(
    memory.state.refresh(read, authorize, { deliveryId: 'large' }),
  ).resolves.toEqual(snapshot)
  expect(read).toHaveBeenCalledTimes(1)
  expect(memory.events).toEqual([{ ...identity, event }])
  expect(memory.published).toEqual([
    { ...identity, event },
    { ...identity, event },
  ])
})
