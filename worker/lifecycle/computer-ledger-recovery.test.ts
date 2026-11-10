import { expect, it } from 'vitest'

import { membersClient } from '../members/members-test-support'
import { reassignWorkspace } from '../members/ownership'
import { joinedMember } from '../operator/suspension-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { recordSandboxCleanup } from './cleanup'
import { computerRecords } from './computer-ledger.test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import {
  retryAllocationCleanup,
  START_ALLOCATION_CLEANUP_KEY,
} from './start-allocation-cleanup'
import { serializeStartJob } from './start-job-codec'
import { nativeWorkspaceStorage } from './platform-storage'
import { createWorkspace } from './workspaces'

const fixtureForTest = setupBackendTests()

it('keeps the last workspace owner when allocation recovery merges a retained computer after workspace removal', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, boat, harness, repositoryId } = fixture
  const nextOwner = await joinedMember(fixture)
  boat.lostCreateReplies = 1
  const created = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const id = created.workspace.id
  const start = fixture.starts.get(id)
  const actor = fixture.actors.get(id)
  if (!start || !actor) throw new Error('Missing start')
  await start.advance()
  const job = await start.job()
  if (!job) throw new Error('Missing allocation job')
  await reassignWorkspace(
    runtime.env.DB,
    org.id,
    user.id,
    id,
    nextOwner.id,
    runtime.dependencies.now(),
    membersClient(harness).hooks,
  )
  await recordSandboxCleanup(runtime.env.DB, {
    workspaceId: id,
    orgId: org.id,
    sandboxId: 'bx_1',
    providerAccount: 'boat',
  })
  await runtime.env.DB.prepare(
    'DELETE FROM computer_ledger WHERE allocation_key = ?',
  )
    .bind(job.attempt)
    .run()
  await runtime.env.DB.prepare('DELETE FROM workspaces WHERE id = ?')
    .bind(id)
    .run()
  await actor.storage.put(START_ALLOCATION_CLEANUP_KEY, serializeStartJob(job))
  expect(
    await retryAllocationCleanup(
      nativeWorkspaceStorage(actor.storage),
      runtime.env,
      runtime.dependencies,
    ),
  ).toBe(true)
  expect(await computerRecords(runtime.env.DB)).toEqual([
    {
      allocationKey: job.attempt,
      sandboxId: 'bx_1',
      providerAccount: 'boat',
      orgId: org.id,
      ownerUserId: nextOwner.id,
      purpose: 'workspace',
      purposeId: id,
      cleanupPending: 0,
      deletedAt: expect.any(Number),
    },
  ])
  expect(boat.deletedIds).toEqual(['bx_1'])
  expect(boat.starts).toHaveLength(2)
})
