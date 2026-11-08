import { afterAll, beforeAll, expect, it } from 'vitest'

import { createToolsHarness, type ToolsHarness } from '../previews/test-support'
import { TEST_TIME } from '../test-support/harness'
import { writeWorkspaceActivity } from './input-activity-data'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
afterAll(async () => harness.dispose())

it('writes monotonically only for the current sandbox, org generation, and running workspace', async () => {
  const seed = await harness.seed()
  const write = (at: number, generation: number) =>
    writeWorkspaceActivity(
      harness.env.DB,
      seed.workspaceId,
      at,
      'bx_one',
      generation,
    )
  expect(await write(TEST_TIME + 20_000, 0)).toBe(true)
  expect(await write(TEST_TIME + 10_000, 0)).toBe(true)
  expect(await harness.status()).toEqual({ activity: TEST_TIME + 20_000 })
  await harness.env.DB.prepare(
    "UPDATE workspaces SET sandbox_id = 'bx_new' WHERE id = ?",
  )
    .bind(seed.workspaceId)
    .run()
  expect(await write(TEST_TIME + 30_000, 0)).toBe(false)
  await harness.env.DB.prepare(
    "UPDATE workspaces SET sandbox_id = 'bx_one' WHERE id = ?",
  )
    .bind(seed.workspaceId)
    .run()
  await harness.env.DB.prepare(
    'UPDATE orgs SET lifecycle_generation = 1 WHERE id = ?',
  )
    .bind(seed.orgId)
    .run()
  expect(await write(TEST_TIME + 40_000, 0)).toBe(false)
  await harness.env.DB.prepare(
    "UPDATE workspaces SET state = 'stopped' WHERE id = ?",
  )
    .bind(seed.workspaceId)
    .run()
  expect(await write(TEST_TIME + 50_000, 1)).toBe(false)
  expect(await harness.status()).toEqual({ activity: TEST_TIME + 20_000 })
  await harness.env.DB.prepare(
    "UPDATE workspaces SET state = 'ready' WHERE id = ?",
  )
    .bind(seed.workspaceId)
    .run()
  expect(await write(TEST_TIME + 60_000, 1)).toBe(true)
  expect(await harness.status()).toEqual({ activity: TEST_TIME + 60_000 })
})
