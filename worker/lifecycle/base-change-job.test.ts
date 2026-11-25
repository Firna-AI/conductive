import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { moveWorkspaceBase, writeWorkspaceTarget } from '../github/base-data'
import type { GitHubSnapshot, GitHubWorkspace } from '../github/contracts'
import { activeWorkspace } from '../github/data'
import type { ReceiverStorage } from '../members/receiver-storage'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { heldOperation } from '../test-support/held-operation'
import {
  BASE_CHANGE_JOB_KEY,
  saveBaseChangeJob,
  saveWorkspaceTargetChange,
} from './base-change-job'
import { baseChangeChatStorage } from './base-change-storage'
import { repositoryDefaultRaceFixture } from './repository-default-race.test-support'

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

async function saveTarget(
  db: D1Database,
  storage: ReceiverStorage,
  workspace: GitHubWorkspace,
  branch: string,
  defaultBranch = workspace.defaultBranch,
) {
  const move = await writeWorkspaceTarget(db, workspace, branch, defaultBranch)
  if (move)
    await baseChangeChatStorage(storage).transaction((transaction) =>
      saveWorkspaceTargetChange(transaction, move, TEST_TIME),
    )
  return move
}

it('keeps the new target and its alarm when another write uses an earlier stored base', async () => {
  const f = await repositoryDefaultRaceFixture(harness)
  const { DB: db } = f.env
  expect(await saveTarget(db, f.storage, f.binding, 'release')).toMatchObject({
    change: { from: 'main', to: 'release' },
    target: 'release',
  })
  const pending = await f.pending()
  expect(pending).toMatchObject({ target: 'release', at: TEST_TIME })
  expect(await f.storage.get('alarm:baseChange')).toBe(TEST_TIME)
  expect(await f.actor.api.storage.getAlarm()).toBe(TEST_TIME)
  expect(await saveTarget(db, f.storage, f.binding, 'stable')).toBeNull()
  expect(await f.pending()).toEqual(pending)
  expect(
    await activeWorkspace(db, f.binding.id, f.binding.orgId),
  ).toMatchObject({
    baseBranch: 'release',
    defaultBranch: 'main',
  })
})

it('drops a saved target when the record changes before the fetch', async () => {
  const f = await repositoryDefaultRaceFixture(harness)
  const { DB: db } = f.env
  expect(await saveTarget(db, f.storage, f.binding, 'release')).not.toBeNull()
  await db
    .prepare('UPDATE workspaces SET base_branch = ? WHERE id = ?')
    .bind('stable', f.binding.id)
    .run()
  await f.advance()
  expect(f.boat.commandRequests).toEqual([])
  expect(await f.pending()).toBeUndefined()
  expect(await f.storage.get('alarm:baseChange')).toBeUndefined()
  expect(
    await activeWorkspace(db, f.binding.id, f.binding.orgId),
  ).toMatchObject({
    baseBranch: 'stable',
    defaultBranch: 'main',
  })
})

it('revokes the earlier fetch when another explicit target replaces its move', async () => {
  const f = await repositoryDefaultRaceFixture(harness)
  const { DB: db } = f.env
  expect(await saveTarget(db, f.storage, f.binding, 'release')).not.toBeNull()
  const first = await f.pending()
  if (!first) throw new Error('Expected an explicit move.')
  const fetched = heldOperation()
  f.boat.beforeCommand = async (command) => {
    if (command.includes('credential.helper=/usr/local/bin/'))
      await fetched.wait()
  }
  const moving = f.advance()
  try {
    await fetched.entered
    expect(await f.credentialSender(first.id)).toBe(f.owner.id)
    const target = { ...f.binding, baseBranch: 'release' }
    expect(await saveTarget(db, f.storage, target, 'stable')).not.toBeNull()
    expect(await f.credentialSender(first.id)).toBeNull()
  } finally {
    fetched.release()
    await moving
  }
  expect(f.installs()).toEqual([])
  expect(await f.pending()).toMatchObject({ target: 'stable', failures: 0 })
  await f.advance()
  expect(f.installs()).toHaveLength(1)
  expect(f.installs()[0].command).toContain('refs/remotes/origin/stable')
  expect(await f.pending()).toBeUndefined()
})

it('replaces a failed deleted-base move and removes its D1 repair marker', async () => {
  const f = await repositoryDefaultRaceFixture(harness)
  const { DB: db } = f.env
  await db
    .prepare('UPDATE workspaces SET base_branch = ? WHERE id = ?')
    .bind('gone-stack', f.binding.id)
    .run()
  const previous = { ...f.binding, baseBranch: 'gone-stack' }
  const change = { from: 'gone-stack', to: 'main' }
  const snapshot: GitHubSnapshot = {
    banner: {
      state: 'none',
      branch: previous.branch,
      baseBranch: 'main',
      baseMoved: 'gone-stack',
      updatedAt: TEST_TIME,
      pullRequest: null,
    },
    checks: { state: 'waiting-for-pull-request', checks: [] },
    headSha: null,
    baseChange: change,
  }
  await baseChangeChatStorage(f.storage).transaction(async (transaction) => {
    await saveBaseChangeJob(transaction, snapshot, previous, TEST_TIME)
    await transaction.put('github:state', snapshot)
  })
  f.boat.synchronousExitCode = 1
  await f.advance()
  const deleted = await f.pending()
  expect(deleted).toMatchObject({ failures: 1, change: snapshot.baseChange })
  expect(
    await saveTarget(db, f.storage, f.binding, 'gone-stack'),
  ).not.toBeNull()
  expect(await f.pending()).toMatchObject({ failures: 0, target: 'gone-stack' })
  expect((await f.pending())?.id).not.toBe(deleted?.id)
  expect(await f.storage.get('github:state')).not.toHaveProperty('baseChange')
  expect(await moveWorkspaceBase(db, f.binding, change)).toBeNull()

  const fresh = { ...snapshot }
  delete fresh.baseChange
  await baseChangeChatStorage(f.storage).transaction((transaction) =>
    saveBaseChangeJob(transaction, fresh, previous, TEST_TIME),
  )
  expect(fresh).not.toHaveProperty('baseChange')
  f.boat.synchronousExitCode = 0
  await f.advance()
  expect(f.fetches().at(-1)?.command).toContain('refs/heads/gone-stack:')
  expect(f.installs()).toHaveLength(1)
  expect(f.installs()[0].command).toContain('refs/remotes/origin/gone-stack')
  expect(await f.pending()).toBeUndefined()
  expect(
    await activeWorkspace(db, f.binding.id, f.binding.orgId),
  ).toMatchObject({
    baseBranch: 'gone-stack',
    defaultBranch: 'main',
  })
})

it('installs the live default with a null base even when the repository row still has its earlier name', async () => {
  const f = await repositoryDefaultRaceFixture(harness)
  const { DB: db } = f.env
  await db
    .prepare('UPDATE workspaces SET base_branch = ? WHERE id = ?')
    .bind('release', f.binding.id)
    .run()
  const previous = { ...f.binding, baseBranch: 'release' }
  expect(
    await saveTarget(db, f.storage, previous, 'trunk', 'trunk'),
  ).toMatchObject({
    target: null,
    change: { from: 'release', to: 'trunk' },
  })
  await f.advance()
  expect(f.installs()).toHaveLength(1)
  expect(f.installs()[0].command).toContain('refs/remotes/origin/trunk')
  expect(await f.pending()).toBeUndefined()
  expect(
    await activeWorkspace(db, f.binding.id, f.binding.orgId),
  ).toMatchObject({
    baseBranch: null,
    defaultBranch: 'main',
  })
})

it.each([
  {
    earlier: 'old-target',
    branch: 'release',
    defaultBranch: 'main',
    target: 'release',
    fetches: [],
    installs: [],
  },
  {
    earlier: null,
    branch: 'main',
    defaultBranch: 'trunk',
    target: 'main',
    fetches: [],
    installs: [],
  },
  {
    earlier: 'old-target',
    branch: 'main',
    defaultBranch: 'main',
    target: null,
    fetches: [expect.stringContaining('refs/heads/main:')],
    installs: [expect.stringContaining('refs/remotes/origin/main')],
  },
])(
  'handles a saved move to $branch from $earlier in the previous Worker format without D1 writes',
  async ({ earlier, branch, defaultBranch, target, fetches, installs }) => {
    const f = await repositoryDefaultRaceFixture(harness)
    const { DB: db } = f.env
    await db
      .prepare('UPDATE workspaces SET base_branch = ? WHERE id = ?')
      .bind(earlier, f.binding.id)
      .run()
    const previous = { ...f.binding, baseBranch: earlier }
    expect(
      await saveTarget(db, f.storage, previous, branch, defaultBranch),
    ).toMatchObject({ target })
    const pending = await f.pending()
    if (!pending) throw new Error('Expected a saved target.')
    // The previous Worker reads only the original job fields.
    const legacy = { ...pending }
    delete legacy.target
    await f.storage.put(BASE_CHANGE_JOB_KEY, legacy)
    await db.batch([
      db.prepare(`CREATE TRIGGER reject_repository_default BEFORE UPDATE OF default_branch ON repositories
        BEGIN SELECT RAISE(ABORT, 'unexpected default write'); END`),
      db.prepare(`CREATE TRIGGER reject_workspace_target BEFORE UPDATE OF base_branch ON workspaces
        BEGIN SELECT RAISE(ABORT, 'unexpected target write'); END`),
    ])
    try {
      await f.advance()
      expect(f.fetches().map(({ command }) => command)).toEqual(fetches)
      expect(f.installs().map(({ command }) => command)).toEqual(installs)
      expect(await f.pending()).toBeUndefined()
      expect(
        await activeWorkspace(db, f.binding.id, f.binding.orgId),
      ).toMatchObject({
        baseBranch: target,
        defaultBranch: 'main',
      })
    } finally {
      await db.batch([
        db.prepare('DROP TRIGGER reject_repository_default'),
        db.prepare('DROP TRIGGER reject_workspace_target'),
      ])
    }
  },
)
