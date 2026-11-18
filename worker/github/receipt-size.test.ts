import { expect, it, vi } from 'vitest'

import { nativeGitHubStore } from './state-fixture.test-support'
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

  const native = await nativeGitHubStore()
  const read = vi.fn(async () => snapshot)
  const authorize = async () => undefined
  await expect(
    native.state.refresh(read, authorize, { deliveryId: 'large' }),
  ).resolves.toEqual(snapshot)
  expect(await native.storage.get('github:delivery:large')).toEqual({
    snapshot,
    envelope: identity,
  })
  expect((await native.inspect()).events).toEqual([{ ...identity, event }])
  expect((await native.inspect()).published).toEqual([{ ...identity, event }])

  await native.restart()
  await expect(
    native.state.refresh(read, authorize, { deliveryId: 'large' }),
  ).resolves.toEqual(snapshot)
  expect(read).toHaveBeenCalledTimes(1)
  expect((await native.inspect()).events).toEqual([{ ...identity, event }])
  expect((await native.inspect()).published).toEqual([
    { ...identity, event },
    { ...identity, event },
  ])
})
