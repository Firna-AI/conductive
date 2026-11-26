import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { WORKSPACE_ID } from '../chat/harness.test-support'
import { HEAD_SHA, repositoryPull } from '../github/fake-pull'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  NEW_FOLDER,
  OLD_FOLDER,
  repositoryChangeFixture,
} from './repository-change.test-support'
import {
  repositoryChangeJobKey,
  type RepositoryChangeJob,
} from './repository-change-types'
import { readWorkspace } from './workspace-data'

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

const notes = async (
  f: Awaited<ReturnType<typeof repositoryChangeFixture>>,
  sessionId: string,
) =>
  (await f.history(sessionId)).events.filter(
    ({ event }) => event.type === 'workspace.repository-changed',
  )

it('changes the repository as another member, keeps the workspace, and publishes one note in every open and closed session', async () => {
  const f = await repositoryChangeFixture(harness)
  const open = await f.createSession()
  const closed = await f.createSession()
  expect(
    (
      await f.fetch(sessionPaths.close(f.org.id, WORKSPACE_ID, closed.id), {
        stopRunningTurn: false,
      })
    ).status,
  ).toBe(200)
  const before = await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)
  await f.env.DB.prepare(
    "UPDATE workspaces SET github_summary = 'ready-to-merge' WHERE id = ?",
  )
    .bind(WORKSPACE_ID)
    .run()
  const tab = await f.tab()
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected a pending change.')
  expect(await f.start()).toEqual(pending)
  await f.finish()
  const result = await f.result(pending.changeId)
  if (result.state !== 'changed') throw new Error('Expected a changed result.')
  expect(result.workspace).toMatchObject({
    id: WORKSPACE_ID,
    number: before.number,
    name: 'Kept name',
    owner: { id: f.owner.id },
    repositoryId: 'billing',
    branch: expect.stringMatching(/^[^/]+\/kept-name-v2-[a-z0-9]{4}$/),
    github: null,
  })
  expect(
    await f.env.DB.prepare(
      'SELECT base_branch AS base FROM workspaces WHERE id = ?',
    )
      .bind(WORKSPACE_ID)
      .first(),
  ).toEqual({ base: null })
  expect(await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).toMatchObject({
    repositoryId: 'billing',
    branch: result.workspace.branch,
    baseBranch: 'trunk',
    sandboxId: 'bx_change',
    taskNumber: before.taskNumber + 1,
    github: null,
  })
  expect(f.refreshed).toMatchObject([
    {
      id: WORKSPACE_ID,
      repositoryId: 77,
      fullName: 'example/billing',
      branch: result.workspace.branch,
      baseBranch: null,
    },
  ])
  for (const session of [open, closed])
    expect((await notes(f, session.id)).map(({ event }) => event)).toEqual([
      {
        type: 'workspace.repository-changed',
        sessionId: session.id,
        member: {
          id: f.memberUser.id,
          githubLogin: f.memberUser.githubLogin,
          displayName: f.memberUser.displayName,
          avatarUrl: f.memberUser.avatarUrl,
        },
        repository: { id: 'billing', fullName: 'example/billing' },
        branch: result.workspace.branch,
        baseBranch: 'trunk',
      },
    ])
  const events = tab.messages.flatMap((message) =>
    message.type === 'event' ? [message.envelope] : [],
  )
  expect(
    events.filter(({ event }) => event.type === 'workspace.repository-changed'),
  ).toHaveLength(2)
  expect(
    events.find(({ event }) => event.type === 'workspace.updated')?.event,
  ).toMatchObject({ workspace: { repositoryId: 'billing' } })
  const [fetch, move] = f.detached()
  expect(fetch.command).toContain('example/billing.git')
  expect(fetch.command).toContain('+refs/heads/trunk:refs/heads/continue-base')
  expect(move.command).toContain(NEW_FOLDER)
  expect(f.boat.commandRequests.at(-1)?.command).toContain(
    '/run/conductive/repository',
  )
  expect(f.controls.moves).toBe(1)
  const count = f.detached().length
  expect(await f.start()).toEqual(result)
  expect(f.detached()).toHaveLength(count)
})

it('returns the question with the work of both folders before the fetch, and goes on after confirmation', async () => {
  const f = await repositoryChangeFixture(harness)
  f.work.set(OLD_FOLDER, ' M old.txt\0\0' + '2\n')
  f.work.set(NEW_FOLDER, '?? notes.md\0\0' + '0')
  f.api.pulls[3] = repositoryPull({
    number: 3,
    headRefName: 'octocat/test',
    url: 'https://github.com/Codertocat/Hello-World/pull/3',
  })
  f.api.comparisons.set('refs/heads/main', new Map([[HEAD_SHA, 4]]))
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected a pending change.')
  await f.finish()
  expect(await f.result(pending.changeId)).toEqual({
    state: 'confirmation-required',
    repository: { id: 'billing', fullName: 'example/billing' },
    branch: 'octocat/test',
    baseBranch: 'trunk',
    work: {
      localWork: { uncommittedFiles: ['old.txt'], unpushedCommits: 2 },
      pullRequest: {
        number: 3,
        url: 'https://github.com/Codertocat/Hello-World/pull/3',
      },
      pushedCommits: 4,
      carriedFiles: ['notes.md'],
    },
  })
  expect(f.detached()).toEqual([])
  expect(
    (await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).repositoryId,
  ).toBe('repo')
  const allowed = await f.start({ allowWork: true })
  if (allowed.state !== 'pending')
    throw new Error('Expected a confirmed change.')
  await f.finish()
  expect(await f.result(allowed.changeId)).toMatchObject({ state: 'changed' })
})

it.each([
  [
    82,
    'Changed files in example/billing clash with its latest default branch. Commit or discard them, then try again.',
  ],
  [81, 'The context folder could not be copied to example/billing.'],
])(
  'keeps the old repository, its chat, and names the reason when the move exits with %i',
  async (exitCode, reason) => {
    const f = await repositoryChangeFixture(harness)
    const session = await f.createSession()
    const pending = await f.start()
    if (pending.state !== 'pending') throw new Error('Expected a change.')
    const job = await f.advanceTo('move')
    f.boat.commandExitCode = exitCode
    await f.finish()
    const failure = f.result(pending.changeId)
    await expect(failure).rejects.toMatchObject({
      status: 409,
      code: 'workspace_repository_change_failed',
    })
    await expect(failure).rejects.toThrow(reason)
    expect(await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).toMatchObject(
      { repositoryId: 'repo', branch: 'octocat/test' },
    )
    expect(await notes(f, session.id)).toEqual([])
    expect(f.refreshed).toEqual([])
    await expect(f.credential(job.fetchId)).rejects.toMatchObject({
      code: 'current_turn_required',
    })
  },
)

it('keeps the old repository when the fetch fails, and closes the fetch credential', async () => {
  const f = await repositoryChangeFixture(harness)
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  const job = await f.advanceTo('fetch')
  f.boat.commandRunning = true
  await f.coordinator.advance()
  expect(await (await f.credential(job.fetchId)).json()).toEqual({
    token: 'member-change-token',
  })
  f.boat.commandRunning = false
  f.boat.commandExitCode = 128
  await f.finish()
  await expect(f.result(pending.changeId)).rejects.toThrow(
    'The latest trunk of example/billing could not be fetched. Check your GitHub access, then try again.',
  )
  await expect(f.credential(job.fetchId)).rejects.toMatchObject({
    code: 'current_turn_required',
  })
  expect(f.detached()).toHaveLength(1)
  expect(
    (await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).repositoryId,
  ).toBe('repo')
})

it('repairs a publication that lost its reply without a second move or a second note', async () => {
  const f = await repositoryChangeFixture(harness)
  const session = await f.createSession()
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  await f.advanceTo('publish')
  await f.failNextCommit('after', 'The committed change reply was lost.')
  await f.coordinator.advance()
  expect(await f.active()).toMatchObject({ phase: 'publish' })
  const after = await notes(f, session.id)
  expect(after).toHaveLength(1)
  const saved = await f.storage.get<RepositoryChangeJob>(
    repositoryChangeJobKey(pending.changeId),
  )
  expect(saved?.outcome).toMatchObject({
    ok: true,
    value: { state: 'changed' },
  })
  const detached = f.detached().length
  f.reconstruct()
  await f.finish()
  expect(await f.result(pending.changeId)).toMatchObject({ state: 'changed' })
  expect(await notes(f, session.id)).toEqual(after)
  expect(f.detached()).toHaveLength(detached)
  expect(f.refreshed).toHaveLength(1)
})

it('publishes a move that lost its exit result once the new folder is on the new branch, with no second checkout', async () => {
  const f = await repositoryChangeFixture(harness)
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  const job = await f.advanceTo('move')
  await f.coordinator.advance()
  f.boat.commandExitCode = 125
  f.inspectBranch(job.branch)
  f.boat.synchronousExitCode = 1
  await f.coordinator.advance()
  expect(await f.result(pending.changeId)).toEqual(pending)
  f.boat.synchronousExitCode = 0
  f.reconstruct()
  await f.finish()
  expect(await f.result(pending.changeId)).toMatchObject({
    state: 'changed',
    workspace: { branch: job.branch, repositoryId: 'billing' },
  })
  expect(f.detached()).toHaveLength(2)
})
