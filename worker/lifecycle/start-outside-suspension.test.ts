import { expect, it } from 'vitest'

import {
  LIFECYCLE_FENCE_KEY,
  type ReceiverFence,
} from '../members/receiver-fence'
import { heldOperation } from '../test-support/held-operation'
import { setupBackendTests } from './backend-test-hooks'
import { computerRecords } from './computer-ledger.test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { START_JOB_KEY } from './start-storage'
import { expectSettled } from './start-outside.test-support'
import { readWorkspace } from './workspace-data'
import { createWorkspace } from './workspaces'

const fixtureForTest = setupBackendTests()

it('retains the allocated sandbox in D1 and makes no start writes after member suspension', async () => {
  const fixture = fixtureForTest()
  const created = await fixture.run(() =>
    createWorkspace(fixture.runtime, fixture.org.id, fixture.user, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const id = created.workspace.id
  const actor = fixture.actors.get(id)
  if (!actor) throw new Error('Missing workspace actor')
  const held = heldOperation()
  const order: string[] = []
  fixture.boat.afterCreate = async () => {
    order.push('create-reply-held')
    await held.wait()
    order.push('create-reply-released')
  }
  const advancing = actor.advance()
  const outcome = advancing.then(
    () => undefined,
    (error: unknown) => error,
  )
  let suspension: Promise<unknown> | undefined
  let suspendedWrites = 0
  let suspendedEvents = 0
  const startWrites: string[] = []
  let markSuspended: () => void = () => undefined
  const suspended = new Promise<void>((resolve) => {
    markSuspended = resolve
  })
  let fenceObserved = false
  try {
    await expectSettled(held.entered)
    await actor.native.configure({
      onPublication: async (event) => {
        actor.events.push(event)
      },
      hooks: {
        afterWrite: async (keys) => {
          startWrites.push(
            ...keys.filter((key) => key.startsWith('lifecycle:start')),
          )
        },
        afterCommit: async (commit) => {
          if (fenceObserved || !commit.writes.includes(LIFECYCLE_FENCE_KEY))
            return
          const fence =
            await commit.storage.get<ReceiverFence>(LIFECYCLE_FENCE_KEY)
          if (fence?.mode !== 'suspended') return
          fenceObserved = true
          order.push('suspended')
          suspendedWrites = startWrites.length
          suspendedEvents = actor.events.length
          markSuspended()
        },
      },
    })
    suspension = actor.native.rpc.suspendMemberLifecycle(
      { orgId: fixture.org.id, generation: 1 },
      id,
    )
    await expectSettled(suspended)
    expect(
      await actor.storage.get<ReceiverFence>(LIFECYCLE_FENCE_KEY),
    ).toMatchObject({ mode: 'suspended', generation: 1 })
    expect(order).toEqual(['create-reply-held', 'suspended'])
  } finally {
    held.release()
    await outcome
    expect(await suspension).toMatchObject({ ok: true })
  }
  expect(await outcome).toMatchObject({ code: 'org_cleanup_busy' })
  expect(await actor.storage.get(START_JOB_KEY)).toBeUndefined()
  expect(
    await readWorkspace(fixture.runtime.env.DB, fixture.org.id, id),
  ).toMatchObject({ sandboxId: 'bx_1' })
  expect(await computerRecords(fixture.runtime.env.DB)).toMatchObject([
    { sandboxId: 'bx_1', purpose: 'workspace', purposeId: id, deletedAt: null },
  ])
  expect(startWrites.slice(suspendedWrites)).toEqual([])
  expect(
    actor.events.slice(suspendedEvents).map(({ event }) => event.type),
  ).not.toContain('start.updated')
  expect(order).toEqual([
    'create-reply-held',
    'suspended',
    'create-reply-released',
  ])
})
