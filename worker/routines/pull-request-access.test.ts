import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { routinePaths } from '../../src/shared/routines'
import { createHarness, type TestHarness } from '../test-support/harness'
import { pullRequestFixture } from './pull-request.test-support'

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

it('records untrusted authors and senders as skipped and admits a named bot by account ID', async () => {
  const h = await pullRequestFixture(harness)
  expect(
    (await h.request(h.payload('opened', 999, 7), 'foreign-author')).status,
  ).toBe(204)
  expect(
    (await h.request(h.payload('opened', 7, 999), 'foreign-sender')).status,
  ).toBe(204)
  expect(
    (await h.rows()).results.map(({ state, code, message }) => ({
      state,
      code,
      message,
    })),
  ).toEqual([
    {
      state: 'skipped',
      code: 'author_not_allowed',
      message:
        'The pull request author is outside the org and is not in Author is.',
    },
    {
      state: 'skipped',
      code: 'sender_not_allowed',
      message: 'The event sender is outside the org and is not in Author is.',
    },
  ])
  const skipped = await harness.request(
    routinePaths.runs(h.org.id, 'routine-one'),
    h.session,
  )
  expect(skipped.status).toBe(200)
  expect(await skipped.json()).toMatchObject({
    runs: [
      {
        state: 'skipped',
        trigger: { kind: 'pull-request', skipLogin: 'event-sender' },
        error: { code: 'sender_not_allowed' },
      },
      {
        state: 'skipped',
        trigger: { kind: 'pull-request', skipLogin: 'pull-author' },
        error: { code: 'author_not_allowed' },
      },
    ],
  })
  expect(h.background).toEqual([])
  await h.configure([
    {
      kind: 'pull-request',
      event: 'opened',
      authors: {
        members: true,
        is: [{ githubId: 999, login: 'old-bot-name' }],
        isNot: [],
      },
    },
  ])
  expect(
    (await h.request(h.payload('opened', 999, 999), 'named-bot')).status,
  ).toBe(204)
  expect((await h.rows()).results.map((row) => row.state)).toEqual([
    'skipped',
    'skipped',
    'queued',
  ])
  expect(h.background).toHaveLength(1)
  expect(
    await h.db
      .prepare(
        "SELECT failed_runs_in_a_row FROM routines WHERE id = 'routine-one'",
      )
      .first('failed_runs_in_a_row'),
  ).toBe(0)
})

it('applies each author filter before trust and records at most one run across matching triggers', async () => {
  const h = await pullRequestFixture(harness)
  const bot = { githubId: 999, login: 'bot' }
  await h.configure([
    {
      kind: 'pull-request',
      event: 'opened',
      authors: { members: true, is: [], isNot: [bot] },
    },
  ])
  expect(
    (await h.request(h.payload('opened', 999, 1000), 'excluded')).status,
  ).toBe(204)
  await h.configure([
    {
      kind: 'pull-request',
      event: 'opened',
      authors: { members: false, is: [bot], isNot: [] },
    },
  ])
  expect((await h.request(h.payload(), 'named-only')).status).toBe(204)
  expect((await h.rows()).results).toEqual([])
  await h.configure([
    {
      kind: 'pull-request',
      event: 'opened',
      authors: { members: false, is: [bot], isNot: [] },
    },
    {
      kind: 'pull-request',
      event: 'opened',
      authors: { members: true, is: [bot], isNot: [] },
    },
  ])
  expect(
    (await h.request(h.payload('opened', 999, 999), 'duplicate-trigger'))
      .status,
  ).toBe(204)
  expect((await h.rows()).results.map((row) => row.state)).toEqual(['queued'])
  expect(h.background).toHaveLength(1)
})

it('ignores own run branches and owner events during queued, starting, working, and input runs', async () => {
  const h = await pullRequestFixture(harness)
  await h.seedRun('existing', {
    kind: 'pull-request',
    event: 'opened',
    number: 2,
    url: 'https://github.com/example/repository/pull/2',
    headBranch: 'changes',
    headSha: 'a'.repeat(40),
    baseBranch: 'main',
  })
  expect((await h.request(h.payload('synchronize'), 'queued')).status).toBe(204)
  await h.db
    .prepare(
      `INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, name, branch, created_at, updated_at)
    VALUES ('run-workspace', ?, ?, ?, 'Run', 'run/own-branch', 0, 0)`,
    )
    .bind(h.org.id, h.repositoryId, h.user.id)
    .run()
  await h.db
    .prepare(
      `INSERT INTO workspace_creation_attempts
    (workspace_id, org_id, sender_user_id, first_message_id, created_at)
    VALUES ('run-workspace', ?, ?, 'message-existing', 0)`,
    )
    .bind(h.org.id, h.user.id)
    .run()
  const admittedBranch = h.payload()
  admittedBranch.number = 3
  admittedBranch.pull_request.number = 3
  admittedBranch.pull_request.head.ref = 'run/own-branch'
  expect((await h.request(admittedBranch, 'admitted-branch')).status).toBe(204)
  expect((await h.rows()).results).toHaveLength(1)
  await h.db
    .prepare(
      "UPDATE routine_runs SET state = 'started', workspace_id = 'run-workspace' WHERE id = 'existing'",
    )
    .run()
  for (const state of ['starting', 'working', 'input']) {
    await h.db
      .prepare("UPDATE workspaces SET state = ? WHERE id = 'run-workspace'")
      .bind(state)
      .run()
    expect((await h.request(h.payload('synchronize'), state)).status).toBe(204)
  }
  expect((await h.rows()).results).toHaveLength(1)
  expect(h.background).toEqual([])
  await h.db
    .prepare("UPDATE routine_runs SET state = 'finished' WHERE id = 'existing'")
    .run()
  await h.db
    .prepare(
      "UPDATE workspaces SET state = 'working' WHERE id = 'run-workspace'",
    )
    .run()
  expect((await h.request(h.payload('synchronize'), 'later-turn')).status).toBe(
    204,
  )
  expect((await h.rows()).results).toHaveLength(1)
  await h.db
    .prepare("UPDATE workspaces SET state = 'ready' WHERE id = 'run-workspace'")
    .run()
  const ownBranch = h.payload()
  ownBranch.pull_request.head.ref = 'run/own-branch'
  expect((await h.request(ownBranch, 'own-branch')).status).toBe(204)
  expect((await h.rows()).results).toHaveLength(1)
  expect((await h.request(h.payload('synchronize'), 'finished')).status).toBe(
    204,
  )
  expect((await h.rows()).results).toHaveLength(2)
  expect(h.background).toHaveLength(1)
})
