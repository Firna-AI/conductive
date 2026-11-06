import { expect, it } from 'vitest'

import type { GitHubSnapshot } from './contracts'
import { MemoryWorkspace } from './test-harness'

const snapshot: GitHubSnapshot = {
  banner: {
    state: 'no-commits',
    branch: 'changes',
    baseBranch: 'main',
    updatedAt: 1,
    pullRequest: null,
    createPullRequestUrl: null,
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

it('stores banner state and a receipt with the shared workspace event sequence before broadcast', async () => {
  const memory = new MemoryWorkspace('workspace-1')
  memory.values.set('workspace:event-number', 7)
  const state = await memory.state.refresh(async () => snapshot, authorize, {
    deliveryId: 'd-1',
  })
  expect(state).toEqual(snapshot)
  expect(memory.values.get('github:state')).toEqual(snapshot)
  expect(memory.values.get('workspace:event:8')).toEqual({
    workspaceId: 'workspace-1',
    eventNumber: 8,
    occurredAt: 1800000000000,
    event: {
      type: 'github.updated',
      banner: snapshot.banner,
      checks: snapshot.checks,
    },
  })
  expect(memory.values.get('github:delivery:d-1')).toEqual({
    snapshot,
    envelope: memory.events[0],
  })
  expect(memory.published).toEqual(memory.events)
})

it('serializes refresh reads so a slow older operation cannot replace newer state', async () => {
  const memory = new MemoryWorkspace('workspace-1')
  const started = deferred()
  const release = deferred()
  const order: string[] = []
  const first = memory.state.refresh(async () => {
    order.push('first-start')
    started.resolve()
    await release.promise
    order.push('first-end')
    return snapshot
  }, authorize)
  await started.promise
  const newer = { ...snapshot, banner: { ...snapshot.banner, updatedAt: 2 } }
  const second = memory.state.refresh(async () => {
    order.push('second')
    return newer
  }, authorize)
  release.resolve()
  await Promise.all([first, second])
  expect(order).toEqual(['first-start', 'first-end', 'second'])
  expect(memory.values.get('github:state')).toEqual(newer)
  expect(memory.published.map((envelope) => envelope.eventNumber)).toEqual([
    1, 2,
  ])
})

it('keeps state and events unchanged when access is revoked before the commit', async () => {
  const memory = new MemoryWorkspace('workspace-1')
  let allowed = true
  const pending = memory.state.refresh(
    async () => {
      allowed = false
      return snapshot
    },
    async () => {
      if (!allowed) throw new Error('Access revoked')
    },
  )
  await expect(pending).rejects.toThrow('Access revoked')
  expect(memory.values.size).toBe(0)
  expect(memory.published).toEqual([])
})
