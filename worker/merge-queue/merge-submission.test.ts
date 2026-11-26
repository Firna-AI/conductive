import { beforeAll, expect, it } from 'vitest'
import { OUTER_WORKSPACE } from '../chat/integration/outer-seed.test-support'
import { requireFeatureResult } from '../features/result'
import { queueId } from './contracts'
import { mergeFixture } from './merge.test-support'
import { queueBundle } from './queue.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

type Fixture = Awaited<ReturnType<typeof mergeFixture>>

async function liveComputer(f: Fixture, workspaceId: string) {
  await f.db
    .prepare(
      "UPDATE workspaces SET sandbox_id = 'bx_queue_submit', state = 'ready' WHERE id = ?",
    )
    .bind(workspaceId)
    .run()
  f.boat.states.set('bx_queue_submit', 'ready')
  f.boat.synchronousOutput = '\0' + '0\n'
}

it('ends an unsent merge if a lower workspace gains local work during verification', async () => {
  const f = await mergeFixture(bundle)
  try {
    await liveComputer(f, OUTER_WORKSPACE)
    f.api.onRequest = async (operation) => {
      if (operation === 'QueuePull') f.boat.synchronousOutput = '\0' + '1\n'
    }
    const denied = await f.click(f.top, 1)
    expect(denied.status).toBe(409)
    expect(await denied.json()).toHaveProperty(
      'error.code',
      'merge_queue_not_ready',
    )
    expect(f.writes()).toEqual([])

    f.api.onRequest = null
    f.boat.synchronousOutput = '\0' + '0\n'
    expect((await f.click(f.top, 1)).status).toBe(202)
    expect(f.writes()).toHaveLength(1)
  } finally {
    await f.dispose()
  }
})

it('waits through local work after a lost merge reply and recovers the accepted job', async () => {
  const f = await mergeFixture(bundle, 'single')
  try {
    await liveComputer(f, OUTER_WORKSPACE)
    f.api.merges.loseNextStartReply = true
    await f.queue.advanceStartAlarm()
    expect(f.writes()).toHaveLength(1)
    expect(f.api.merges.jobs.size).toBe(1)
    const id = queueId(f.scope)
    const restarted = await f.request(
      `/__test/continue-restart?workspace=${encodeURIComponent(id)}`,
      { method: 'POST', body: '{}' },
    )
    expect(restarted.status).toBe(500)
    await restarted.arrayBuffer()
    const queue = f.actor(id)
    f.boat.synchronousOutput = '\0' + '1\n'
    await queue.advanceStartAlarm()
    expect(f.writes()).toHaveLength(1)

    f.boat.synchronousOutput = '\0' + '0\n'
    requireFeatureResult(await queue.wakeMergeQueue(f.scope))
    await queue.advanceStartAlarm()
    await queue.advanceStartAlarm()
    expect(f.writes()).toHaveLength(2)
    expect(f.api.merges.jobs.size).toBe(1)
    for (const job of f.api.merges.jobs.values()) job.state = 'merged'
    await queue.advanceStartAlarm()
    expect(await f.records()).toEqual([
      { number: 2, workspaceId: OUTER_WORKSPACE },
    ])
  } finally {
    await f.dispose()
  }
})
