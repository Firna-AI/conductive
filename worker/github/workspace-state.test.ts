import { expect, it, vi } from 'vitest'

import type { GitHubSnapshot } from './contracts'
import { CHAT_META, chatEventKey } from '../chat/storage-keys'
import { nativeGitHubStore } from './state-fixture.test-support'

const snapshot: GitHubSnapshot = {
  banner: {
    state: 'no-commits',
    branch: 'changes',
    baseBranch: 'main',
    updatedAt: 1,
    pullRequest: null,
  },
  checks: { state: 'waiting-for-pull-request', checks: [] },
  headSha: null,
}
const authorize = async () => undefined

function deferred() {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

it('stores banner state, an event, and a receipt before broadcast through the production chat port', async () => {
  const native = await nativeGitHubStore()
  await native.storage.put(CHAT_META, {
    workspaceId: 'workspace-1',
    through: 7,
    commandThrough: 0,
  })
  const state = await native.state.refresh(async () => snapshot, authorize, {
    deliveryId: 'd-1',
  })
  expect(state).toEqual(snapshot)
  expect(await native.storage.get('github:state')).toEqual(snapshot)
  expect(await native.storage.get(chatEventKey(8))).toEqual({
    workspaceId: 'workspace-1',
    eventNumber: 8,
    occurredAt: 1800000000000,
    event: {
      type: 'github.updated',
      banner: snapshot.banner,
      checks: snapshot.checks,
    },
  })
  expect(await native.storage.get('github:delivery:d-1')).toEqual({
    snapshot,
    envelope: {
      workspaceId: 'workspace-1',
      eventNumber: 8,
      occurredAt: 1800000000000,
    },
  })
  expect((await native.inspect()).published).toEqual(
    (await native.inspect()).events,
  )
})

it('rolls back a receipt-write failure and retries with one new read and event', async () => {
  const native = await nativeGitHubStore()
  const read = vi.fn(async () => snapshot)
  await native.setStorageHooks({
    beforeCommit: async (commit) => {
      if (commit.writes.some((key) => key.startsWith('github:delivery:')))
        throw new Error('Test storage write failed')
    },
  })
  await expect(
    native.state.refresh(read, authorize, { deliveryId: 'd-1' }),
  ).rejects.toThrow('Test storage write failed')
  expect(read).toHaveBeenCalledTimes(1)
  expect(await native.storage.get('github:state')).toBeUndefined()
  expect(await native.storage.get(chatEventKey(1))).toBeUndefined()
  expect(
    (await native.storage.get<{ through: number }>(CHAT_META))?.through,
  ).toBeUndefined()
  expect(await native.storage.get('github:delivery:d-1')).toBeUndefined()
  expect((await native.snapshot()).records.size).toBe(0)
  expect((await native.inspect()).events).toEqual([])
  expect((await native.inspect()).published).toEqual([])

  await native.clearFaults()
  expect(
    await native.state.refresh(read, authorize, { deliveryId: 'd-1' }),
  ).toEqual(snapshot)
  expect(read).toHaveBeenCalledTimes(2)
  const envelope = {
    workspaceId: 'workspace-1',
    eventNumber: 1,
    occurredAt: 1800000000000,
    event: {
      type: 'github.updated',
      banner: snapshot.banner,
      checks: snapshot.checks,
    },
  }
  expect(await native.storage.get('github:state')).toEqual(snapshot)
  expect(
    (await native.storage.get<{ through: number }>(CHAT_META))?.through,
  ).toBe(1)
  expect(await native.storage.get(chatEventKey(1))).toEqual(envelope)
  expect(await native.storage.get('github:delivery:d-1')).toEqual({
    snapshot,
    envelope: {
      workspaceId: 'workspace-1',
      eventNumber: 1,
      occurredAt: 1800000000000,
    },
  })
  expect((await native.inspect()).events).toEqual([envelope])
  expect((await native.inspect()).published).toEqual([envelope])
})

it('serializes refresh reads so a slow older operation cannot replace newer state', async () => {
  const native = await nativeGitHubStore()
  const started = deferred()
  const release = deferred()
  const order: string[] = []
  const first = native.state.refresh(async () => {
    order.push('first-start')
    started.resolve()
    await release.promise
    order.push('first-end')
    return snapshot
  }, authorize)
  await started.promise
  const newer = { ...snapshot, banner: { ...snapshot.banner, updatedAt: 2 } }
  const second = native.state.refresh(async () => {
    order.push('second')
    return newer
  }, authorize)
  release.resolve()
  await Promise.all([first, second])
  expect(order).toEqual(['first-start', 'first-end', 'second'])
  expect(await native.storage.get('github:state')).toEqual(snapshot)
  expect(
    (await native.inspect()).published.map((envelope) => envelope.eventNumber),
  ).toEqual([1])
})

it('keeps state and events unchanged when access is revoked before the commit', async () => {
  const native = await nativeGitHubStore()
  let allowed = true
  const pending = native.state.refresh(
    async () => {
      allowed = false
      return snapshot
    },
    async () => {
      if (!allowed) throw new Error('Access revoked')
    },
  )
  await expect(pending).rejects.toThrow('Access revoked')
  expect((await native.snapshot()).records.size).toBe(0)
  expect((await native.inspect()).published).toEqual([])
})

it('keeps an unchanged display snapshot without storing or publishing a fresh read', async () => {
  const native = await nativeGitHubStore()
  await native.state.refresh(async () => snapshot, authorize)
  const fresh = {
    banner: {
      pullRequest: null,
      updatedAt: 2,
      baseBranch: 'main',
      branch: 'changes',
      state: 'no-commits',
    } satisfies GitHubSnapshot['banner'],
    checks: {
      checks: [],
      state: 'waiting-for-pull-request',
    } satisfies GitHubSnapshot['checks'],
    headSha: 'new-head-with-the-same-display',
  }
  expect(await native.state.refresh(async () => fresh, authorize)).toEqual(
    fresh,
  )
  expect(await native.storage.get('github:state')).toEqual(snapshot)
  expect(
    (await native.inspect()).events.map((envelope) => envelope.eventNumber),
  ).toEqual([1])
  expect((await native.inspect()).published).toEqual(
    (await native.inspect()).events,
  )
})
