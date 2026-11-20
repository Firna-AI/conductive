import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  createChatFixture,
  WORKSPACE_ID,
  type ChatFixture,
} from './harness.test-support'
import {
  lifecycleSnapshot,
  messageCommands,
} from './turn-lifecycle.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

const STOREFRONT = '/home/user/code/repo'
const BILLING = '/home/user/code/billing'

/** The workspace holds two folders. Each test can move its record to billing. */
async function folders(fixture: ChatFixture, repositoryId = 'repo') {
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('billing', ?, 11, 'example/billing', 'trunk')",
    ).bind(fixture.org.id),
    harness.env.DB.prepare(
      `INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id, repository_locations_json)
      VALUES (?, ?, ?, 'first-session', 'first-turn', 'claude', 'test-claude', 'high', 'first-message', ?)`,
    ).bind(
      WORKSPACE_ID,
      fixture.org.id,
      fixture.owner.id,
      JSON.stringify([
        {
          repositoryId: 'billing',
          directory: BILLING,
          variable: 'CONDUCTIVE_REPOSITORY_BILLING_DIR',
        },
        {
          repositoryId: 'repo',
          directory: STOREFRONT,
          variable: 'CONDUCTIVE_REPOSITORY_REPO_DIR',
        },
      ]),
    ),
    harness.env.DB.prepare(
      "UPDATE workspaces SET repository_id = ?, branch = 'octocat/billing-v2-cd34' WHERE id = ?",
    ).bind(repositoryId, WORKSPACE_ID),
  ])
}

async function ready(fixture: ChatFixture, runner: FakeRunner) {
  await fixture.connect(runner)
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  return runner
}

const moves = (runner: FakeRunner) =>
  runner.commands.filter((command) => command.type === 'repository.move')

it('sends no move to a runner in the record folder and names the repository in each turn', async () => {
  const fixture = await createChatFixture(harness)
  await folders(fixture)
  const session = await fixture.createSession()
  const runner = await ready(
    fixture,
    new FakeRunner({ workspaceId: WORKSPACE_ID, repositoryFolder: STOREFRONT }),
  )
  await fixture.send(session.id, 'same-folder')
  expect(moves(runner)).toEqual([])
  expect(messageCommands(runner, 'same-folder')).toMatchObject([
    {
      type: 'turn',
      repository: { fullName: 'example/repo', folder: STOREFRONT },
    },
  ])
})

it('holds turns while a capable runner moves, and sends them after its new hello', async () => {
  const fixture = await createChatFixture(harness)
  await folders(fixture, 'billing')
  const session = await fixture.createSession()
  const runner = await ready(
    fixture,
    new FakeRunner({ workspaceId: WORKSPACE_ID, repositoryFolder: STOREFRONT }),
  )
  const [move] = moves(runner)
  expect(moves(runner)).toEqual([
    {
      type: 'repository.move',
      commandId: expect.any(String),
      folder: BILLING,
      branches: {
        workspaceBranch: 'octocat/billing-v2-cd34',
        targetBranch: 'trunk',
      },
    },
  ])
  await fixture.send(session.id, 'held')
  await fixture.drain()
  expect(messageCommands(runner, 'held')).toEqual([])
  expect(moves(runner)).toEqual([move])
  await fixture.disconnect(runner)
  const stale = await ready(
    fixture,
    new FakeRunner({ workspaceId: WORKSPACE_ID, repositoryFolder: STOREFRONT }),
  )
  expect(moves(stale)).toHaveLength(1)
  expect(messageCommands(stale, 'held')).toEqual([])
  await fixture.disconnect(stale)
  const moved = await ready(
    fixture,
    new FakeRunner({ workspaceId: WORKSPACE_ID, repositoryFolder: BILLING }),
  )
  expect(moves(moved)).toEqual([])
  expect(messageCommands(moved, 'held')).toMatchObject([
    {
      type: 'turn',
      branches: {
        workspaceBranch: 'octocat/billing-v2-cd34',
        targetBranch: 'trunk',
      },
      repository: { fullName: 'example/billing', folder: BILLING },
    },
  ])
})

it.each([
  ['a runner that cannot move', undefined],
  ['a runner in a folder outside the stored folders', '/home/user/old/repo'],
])('sends no move and no repository to %s', async (_, repositoryFolder) => {
  const fixture = await createChatFixture(harness)
  await folders(fixture, 'billing')
  const session = await fixture.createSession()
  const runner = await ready(
    fixture,
    new FakeRunner({ workspaceId: WORKSPACE_ID, repositoryFolder }),
  )
  await fixture.send(session.id, 'kept-folder')
  expect(moves(runner)).toEqual([])
  const [turn] = messageCommands(runner, 'kept-folder')
  expect(turn).toMatchObject({ type: 'turn' })
  expect(turn).not.toHaveProperty('repository')
})

it('fails the held turn after a refused move, and moves again after a new hello', async () => {
  const fixture = await createChatFixture(harness)
  await folders(fixture, 'billing')
  const session = await fixture.createSession()
  const runner = await ready(
    fixture,
    new FakeRunner({ workspaceId: WORKSPACE_ID, repositoryFolder: STOREFRONT }),
  )
  await fixture.send(session.id, 'refused')
  const [move] = moves(runner)
  if (!move) throw new Error('The move is missing.')
  runner.reply({
    type: 'repository.move.refused',
    commandId: move.commandId,
    reason: 'not_repository',
  })
  await fixture.drain()
  expect(messageCommands(runner, 'refused')).toEqual([])
  const failed = (await fixture.history(session.id)).events.flatMap(
    ({ event }) => (event.type === 'turn.failed' ? [event] : []),
  )
  expect(failed).toMatchObject([
    {
      error: {
        code: 'workspace_repository_unavailable',
        message:
          "The agent could not open the folder of the workspace's repository in this cloud computer.",
      },
      retryMessageId: 'refused',
    },
  ])
  expect((await lifecycleSnapshot(fixture)).commands).toEqual([])
  await fixture.disconnect(runner)
  const again = await ready(
    fixture,
    new FakeRunner({ workspaceId: WORKSPACE_ID, repositoryFolder: STOREFRONT }),
  )
  expect(moves(again)).toHaveLength(1)
})
