import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { writeWorkspaceTarget } from '../github/base-data'
import { activeWorkspace } from '../github/data'
import { saveWorkspaceTargetChange } from '../lifecycle/base-change-job'
import { baseChangeChatStorage } from '../lifecycle/base-change-storage'
import { repositoryDefaultRaceFixture } from '../lifecycle/repository-default-race.test-support'
import { WorkspaceBaseChanges } from '../lifecycle/workspace-base'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('resumes and installs a saved target after its fetch failed before hibernation', async () => {
  const f = await repositoryDefaultRaceFixture(harness)
  const { DB: db } = f.env
  const move = await writeWorkspaceTarget(
    db,
    f.binding,
    'feature/review',
    'main',
  )
  expect(move).toMatchObject({ target: 'feature/review' })
  if (!move) throw new Error('Expected a written target.')
  await baseChangeChatStorage(f.storage).transaction((transaction) =>
    saveWorkspaceTargetChange(transaction, move, TEST_TIME),
  )
  const pending = await f.pending()
  if (!pending) throw new Error('Expected an explicit move.')
  const jobOwner = () =>
    new WorkspaceBaseChanges(
      f.env,
      {
        fetch: f.boat.fetch,
        now: () => TEST_TIME,
        randomToken: () => 'unused-target-token',
      },
      f.storage,
    )
  let changes = jobOwner()
  const senders: (string | null | undefined)[] = []
  f.boat.beforeCommand = async () => {
    senders.push(await changes.credentialSender(pending.id))
  }
  f.boat.synchronousExitCode = 1
  await changes.advance()
  expect(f.fetches()).toHaveLength(1)
  expect(f.installs()).toEqual([])
  expect(senders).toEqual([f.owner.id])
  const retry = { ...pending, at: TEST_TIME + 1000, failures: 1 }
  expect(await f.pending()).toEqual(retry)

  const instance = await f.actor.api.controls.instanceId()
  await f.actor.restart()
  expect(await f.actor.api.controls.instanceId()).not.toBe(instance)
  expect(await f.pending()).toEqual(retry)

  changes = jobOwner()
  expect(await changes.credentialSender(pending.id)).toBeNull()
  f.boat.synchronousExitCode = 0
  expect(await changes.resume()).toBe(true)
  expect(f.fetches()).toHaveLength(2)
  expect(f.fetches()[1].command).toContain('refs/heads/feature/review:')
  expect(f.fetches()[1].command).toContain(pending.id)
  expect(f.installs()).toHaveLength(1)
  expect(f.installs()[0].command).toContain(
    'refs/remotes/origin/feature/review',
  )
  expect(f.installs()[0].command).toMatch(
    /branch\.octocat\/test\.gh-merge-base['" ]+feature\/review/,
  )
  expect(senders).toEqual([f.owner.id, f.owner.id, null])
  expect(await f.pending()).toBeUndefined()
  expect(await f.storage.get('alarm:baseChange')).toBeUndefined()
  expect(
    await activeWorkspace(db, f.binding.id, f.binding.orgId),
  ).toMatchObject({
    baseBranch: 'feature/review',
    defaultBranch: 'main',
  })
})
