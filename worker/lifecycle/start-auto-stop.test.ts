import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import {
  changeIdleStopSetting,
  readIdleStopSetting,
} from '../operator/idle-stop-data'
import { setupBackendTests } from './backend-test-hooks'
import { pendingCreate } from './start-chain.test-support'

const fixtureForTest = setupBackendTests()

it('sets the operator deadline once across readiness and the first command, then refreshes only after sixty seconds', async () => {
  const fixture = fixtureForTest()
  const db = fixture.runtime.env.DB
  const setting = await readIdleStopSetting(db)
  expect(
    await changeIdleStopSetting(
      db,
      setting.minutes,
      15,
      fixture.user.id,
      TEST_TIME,
    ),
  ).toBe(true)
  const start = await pendingCreate(fixture)
  await start.actor.advance(TEST_TIME + 1_000)
  expect(await start.job()).toMatchObject({
    phase: 'fetch',
    processId: 1,
    autoStopSetAt: TEST_TIME + 1_000,
  })
  expect(fixture.boat.deadlineIds).toEqual(['bx_1'])
  fixture.boat.commandRunning = true
  await start.actor.advance(TEST_TIME + 60_000)
  expect(fixture.boat.deadlineIds).toEqual(['bx_1'])
  await start.restart()
  await start.actor.advance(TEST_TIME + 61_000)
  expect(fixture.boat.deadlineIds).toEqual(['bx_1', 'bx_1'])
  expect(await start.job()).toMatchObject({ autoStopSetAt: TEST_TIME + 61_000 })
  const updates = fixture.boat.server.requests.filter(
    (request) => request.method === 'PATCH',
  )
  expect(await Promise.all(updates.map((request) => request.json()))).toEqual([
    { ttlSeconds: 960 },
    { ttlSeconds: 960 },
  ])
})

it.each([
  { age: 59_999, calls: 0 },
  { age: 60_000, calls: 1 },
])(
  'refreshes readiness auto-stop $calls times when its last set is $age ms old',
  async ({ age, calls }) => {
    const fixture = fixtureForTest()
    const start = await pendingCreate(fixture)
    fixture.boat.afterCreate = async (id) => {
      fixture.boat.states.set(id, 'provisioning')
    }
    await start.actor.advance(TEST_TIME + 1_000)
    const job = await start.stored()
    await start.save({ ...job, autoStopSetAt: TEST_TIME + 2_000 - age })
    fixture.boat.states.set('bx_1', 'ready')
    await start.actor.advance(TEST_TIME + 2_000)
    expect(await start.job()).toMatchObject({ phase: 'fetch', processId: 1 })
    expect(fixture.boat.deadlineIds).toHaveLength(calls)
  },
)
