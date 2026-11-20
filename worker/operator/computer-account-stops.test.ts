import { expect, it } from 'vitest'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { computerDeletedStatement } from '../lifecycle/computer-ledger'
import {
  COMPUTER_STOP_TASK_KEY,
  computerStopObjectName,
  type ComputerStopTaskState,
} from '../lifecycle/computer-stop-task'
import { TEST_TIME } from '../test-support/harness'
import { seedWorkspace } from '../members/members-test-support'
import { imageRetryFixture } from '../lifecycle/retry-test-support'
import { suspensionComputers } from './computer-data'
import { suspendOrg } from './suspend-org'

const fixtureForTest = setupBackendTests()

it('distinguishes a current resource from its retained equal ID in another account', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, harness, repositoryId } = fixture
  await seedWorkspace(
    harness,
    org,
    user,
    'current-workspace',
    repositoryId,
    'shared-computer',
  )
  await runtime.env.DB.prepare(
    "UPDATE workspaces SET provider_account = 'boat-second' WHERE id = 'current-workspace'",
  ).run()
  const image = await imageRetryFixture(fixture, { steps: 1 })
  await runtime.env.DB.prepare(
    "UPDATE image_builds SET provider_account = 'boat-second' WHERE id = ?",
  )
    .bind(image.id)
    .run()
  expect(
    (
      await suspensionComputers(runtime.env.DB, { kind: 'org', orgId: org.id })
    ).map((computer) => ({
      account: computer.providerAccount,
      purpose: computer.purpose,
      current: computer.currentWorkspace,
      unfinished: computer.unfinishedBuild,
    })),
  ).toEqual([
    { account: 'boat', purpose: 'workspace', current: 0, unfinished: 0 },
    { account: 'boat-second', purpose: 'workspace', current: 1, unfinished: 0 },
    { account: 'boat', purpose: 'build', current: 0, unfinished: 0 },
    { account: 'boat-second', purpose: 'build', current: 0, unfinished: 1 },
  ])
})

it('keeps paired Stop tasks across restarts and retains an unknown account', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, harness, boat } = fixture
  boat.server.addAccount({ orgId: 'second-org', apiKey: 'boat-second' })
  runtime.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    'boat-second': { kind: 'boat', orgId: 'second-org', apiKey: 'boat-second' },
  })
  const computers = ['boat', 'boat-second', 'unknown'].map(
    (providerAccount) => ({ sandboxId: 'shared-computer', providerAccount }),
  )
  for (const computer of computers)
    await runtime.env.DB.prepare(
      `INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, purpose)
      VALUES (?, ?, ?, 'retained')`,
    )
      .bind(computer.sandboxId, computer.providerAccount, org.id)
      .run()
  const taskName = computerStopObjectName(org.id)
  const task = harness.native.actor(taskName, {
    environment: {
      SANDBOX_PROVIDER_ACCOUNTS: runtime.env.SANDBOX_PROVIDER_ACCOUNTS,
    },
  })
  await task.ready
  boat.failStop = true
  for (let request = 0; request < 2; request++)
    expect(await suspendOrg(runtime, org.id, user.id)).toMatchObject({
      pendingWorkspaceIds: ['shared-computer'],
      pendingBuildIds: [],
    })
  expect(
    await task.api.storage.get<ComputerStopTaskState>(COMPUTER_STOP_TASK_KEY),
  ).toEqual({ orgId: org.id, computers })
  expect(
    boat.server.requests.map((request) => request.headers.get('X-Boat-Org')),
  ).toEqual([
    'app-org',
    'app-org',
    'second-org',
    'second-org',
    'app-org',
    'app-org',
    'second-org',
    'second-org',
  ])
  await computerDeletedStatement(runtime.env.DB, computers[0], TEST_TIME).run()
  const earlierRequests = boat.server.requests.length
  await task.restart()
  boat.failStop = false
  await fixture.advanceTo(TEST_TIME + 30_000, taskName)
  expect(
    boat.server.requests
      .slice(earlierRequests)
      .map((request) => request.headers.get('X-Boat-Org')),
  ).toEqual(['second-org'])
  expect(
    await task.api.storage.get<ComputerStopTaskState>(COMPUTER_STOP_TASK_KEY),
  ).toEqual({ orgId: org.id, computers: [computers[2]] })
  expect(await task.api.storage.getAlarm()).toBe(TEST_TIME + 60_000)
  await task.restart()
  await fixture.advanceTo(TEST_TIME + 60_000, taskName)
  expect(
    await task.api.storage.get<ComputerStopTaskState>(COMPUTER_STOP_TASK_KEY),
  ).toEqual({ orgId: org.id, computers: [computers[2]] })
  expect(boat.server.requests).toHaveLength(earlierRequests + 1)
})
