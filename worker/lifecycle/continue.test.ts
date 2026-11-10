import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { WORKSPACE_ID } from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { continueFixture } from './continue.test-support'
import { continueJobKey, type ContinueJob } from './continue-types'
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

it('continues as another member, keeps workspace identity, and publishes one note in every open and closed session', async () => {
  const f = await continueFixture(harness)
  const open = await f.createSession()
  const closed = await f.createSession()
  expect(
    (
      await f.fetch(sessionPaths.close(f.org.id, WORKSPACE_ID, closed.id), {
        stopRunningTurn: false,
      })
    ).status,
  ).toBe(200)
  const tab = await f.tab()
  await f.env.DB.prepare(
    "UPDATE users SET github_login = 'current-owner' WHERE id = ?",
  )
    .bind(f.owner.id)
    .run()
  const pending = await f.start()
  expect(pending.state).toBe('pending')
  expect(await f.start()).toEqual(pending)
  await f.finish()
  if (pending.state !== 'pending') throw new Error('Expected pending Continue.')
  const result = await f.result(pending.continueId)
  expect(result.state).toBe('continued')
  if (result.state !== 'continued')
    throw new Error('Expected continued workspace.')
  expect(result.workspace).toMatchObject({
    id: WORKSPACE_ID,
    name: 'Kept name',
    owner: { id: f.owner.id },
    branch: expect.stringMatching(/^current-owner\/[a-z]+-[a-z0-9]{4}$/),
  })
  expect(
    (await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).sandboxId,
  ).toBe('bx_continue')
  expect(f.refreshed).toMatchObject([
    { id: WORKSPACE_ID, branch: result.workspace.branch },
  ])
  for (const session of [open, closed]) {
    const notes = (await f.history(session.id)).events.filter(
      ({ event }) => event.type === 'workspace.continued',
    )
    expect(notes.map(({ event }) => event)).toEqual([
      {
        type: 'workspace.continued',
        sessionId: session.id,
        member: {
          id: f.memberUser.id,
          githubLogin: f.memberUser.githubLogin,
          displayName: f.memberUser.displayName,
          avatarUrl: f.memberUser.avatarUrl,
        },
        branch: result.workspace.branch,
        baseBranch: 'main',
      },
    ])
  }
  const events = tab.messages.flatMap((message) =>
    message.type === 'event' ? [message.envelope] : [],
  )
  expect(
    events.filter(({ event }) => event.type === 'workspace.continued'),
  ).toHaveLength(2)
  expect(events.map(({ eventNumber }) => eventNumber)).toEqual(
    [...events.map(({ eventNumber }) => eventNumber)].sort((a, b) => a - b),
  )
  const count = f.boat.commandRequests.filter(({ detached }) => detached).length
  expect(await f.start()).toEqual(result)
  expect(
    f.boat.commandRequests.filter(({ detached }) => detached),
  ).toHaveLength(count)
})

it('returns the full local-work question before fetching and retries only after confirmation', async () => {
  const f = await continueFixture(harness)
  f.boat.synchronousOutput = ' M changed.txt\0\0' + '3\n'
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected pending Continue.')
  await f.finish()
  expect(await f.result(pending.continueId)).toEqual({
    state: 'confirmation-required',
    branch: 'octocat/test',
    baseBranch: 'main',
    localWork: { uncommittedFiles: ['changed.txt'], unpushedCommits: 3 },
  })
  expect(f.boat.commandRequests.filter(({ detached }) => detached)).toEqual([])
  expect((await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).branch).toBe(
    'octocat/test',
  )
  const allowed = await f.start({ allowLocalWork: true })
  await f.finish()
  if (allowed.state !== 'pending')
    throw new Error('Expected confirmed Continue.')
  expect(await f.result(allowed.continueId)).toMatchObject({
    state: 'continued',
  })
})

it('keeps the branch and chat unchanged when the move fails and expires its fetch credential scope', async () => {
  const f = await continueFixture(harness)
  const session = await f.createSession()
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected pending Continue.')
  const job = await f.advanceTo('move')
  f.boat.commandExitCode = 1
  await f.finish()
  await expect(f.result(pending.continueId)).rejects.toMatchObject({
    status: 409,
    code: 'workspace_continue_failed',
  })
  expect((await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).branch).toBe(
    'octocat/test',
  )
  expect(
    (await f.history(session.id)).events.filter(
      ({ event }) => event.type === 'workspace.continued',
    ),
  ).toEqual([])
  await expect(f.credential(job.fetchId)).rejects.toMatchObject({
    code: 'current_turn_required',
  })
})

it('repairs publication after a committed transaction loses its reply without a second branch move or duplicate note', async () => {
  const f = await continueFixture(harness)
  const session = await f.createSession()
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected pending Continue.')
  await f.advanceTo('publish')
  await f.failNextCommit('after', 'The committed Continue reply was lost.')
  await f.coordinator.advance()
  expect(await f.active()).toMatchObject({
    id: pending.continueId,
    phase: 'publish',
  })
  const after = (await f.history(session.id)).events.filter(
    ({ event }) => event.type === 'workspace.continued',
  )
  expect(after).toHaveLength(1)
  const saved = await f.storage.get<ContinueJob>(
    continueJobKey(pending.continueId),
  )
  if (!saved?.outcome?.ok || saved.outcome.value.state !== 'continued')
    throw new Error('Missing committed Continue reply.')
  await f.storage.put(continueJobKey(pending.continueId), {
    ...saved,
    outcome: {
      ok: true,
      value: {
        ...saved.outcome.value,
        workspace: {
          ...saved.outcome.value.workspace,
          restoreUntil: undefined,
        },
      },
    },
  })
  const commands = f.boat.commands.length
  f.reconstruct()
  await f.finish()
  expect(await f.result(pending.continueId)).toMatchObject({
    state: 'continued',
    workspace: { restoreUntil: null },
  })
  expect(
    (await f.history(session.id)).events.filter(
      ({ event }) => event.type === 'workspace.continued',
    ),
  ).toEqual(after)
  expect(f.boat.commands).toHaveLength(commands)
})

it('publishes an already switched branch after the command loses its exit result and runs no second checkout', async () => {
  const f = await continueFixture(harness)
  const session = await f.createSession()
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected pending Continue.')
  const job = await f.advanceTo('move')
  await f.coordinator.advance()
  f.boat.commandExitCode = 125
  f.inspectBranch('another/branch')
  await f.coordinator.advance()
  expect(await f.result(pending.continueId)).toEqual(pending)
  expect((await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).branch).toBe(
    'octocat/test',
  )
  f.inspectBranch(job.branch)
  f.boat.synchronousExitCode = 1
  f.reconstruct()
  await f.coordinator.advance()
  expect(await f.result(pending.continueId)).toEqual(pending)
  expect((await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).branch).toBe(
    'octocat/test',
  )
  f.boat.synchronousExitCode = 0
  f.reconstruct()
  await f.finish()
  await expect(f.result(pending.continueId)).resolves.toMatchObject({
    state: 'continued',
    workspace: { branch: job.branch },
  })
  expect((await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).branch).toBe(
    job.branch,
  )
  expect(
    f.boat.commandRequests.filter(({ detached }) => detached),
  ).toHaveLength(2)
  expect(
    (await f.history(session.id)).events.filter(
      ({ event }) => event.type === 'workspace.continued',
    ),
  ).toHaveLength(1)
})
