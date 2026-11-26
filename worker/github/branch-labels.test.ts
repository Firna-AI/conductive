import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { workspaceEventsPath } from '../../src/shared/events'
import { githubPaths } from '../../src/shared/github'
import { orgEnvironmentContext } from '../lifecycle/settings-data'
import { encrypt } from '../security/crypto'
import { TEST_ORIGIN } from '../test-support/harness'
import { githubUpdated } from './delivery-receipt'
import type { GitHubWorkspace } from './contracts'
import { HEAD_SHA } from './fake-pull'
import { createGitHubHarness, type GitHubTestHarness } from './test-harness'

let harness: GitHubTestHarness
beforeAll(async () => {
  harness = await createGitHubHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.base.dispose()
})

const rawBranches = {
  branch: 'feature/fixture-secret',
  baseBranch: 'target/fixture-secret',
}
const labels = {
  ...rawBranches,
  displayBranch: 'feature/[redacted]',
  displayBaseBranch: 'target/[redacted]',
}

async function captureSecret(workspace: GitHubWorkspace, userId: string) {
  const ciphertext = await encrypt(
    JSON.stringify({ DUMMY: 'fixture-secret' }),
    orgEnvironmentContext(workspace.orgId),
    harness.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await harness.env.DB.prepare(
    `INSERT INTO workspace_runtime
     (workspace_id, org_id, created_by_user_id, session_id, first_turn_id,
      environment_ciphertext, agent, model, effort, first_message_id)
     VALUES (?, ?, ?, 'unused', 'unused', ?, 'claude', 'test', 'high', 'unused')`,
  )
    .bind(workspace.id, workspace.orgId, userId, ciphertext)
    .run()
}

async function labeledWorkspace(captured = true) {
  const seeded = await harness.seed(rawBranches.branch)
  if (captured) await captureSecret(seeded.workspace, seeded.userId)
  harness.api.branches.set(`refs/heads/${rawBranches.branch}`, HEAD_SHA)
  harness.api.pulls[2].headRefName = rawBranches.branch
  harness.api.pulls[2].baseRefName = rawBranches.baseBranch
  return seeded
}

it('masks stored and fresh branch labels from the running environment without changing branch identities', async () => {
  const { orgId, workspace, session } = await labeledWorkspace()
  const fresh = await harness.read(
    githubPaths.banner(orgId, workspace.id),
    session,
  )
  expect(fresh.status).toBe(200)
  expect(await fresh.json()).toMatchObject({ banner: labels })
  const reads = harness.api.requests.length
  const stored = await harness.read(
    githubPaths.stored(orgId, workspace.id),
    session,
  )
  expect(stored.status).toBe(200)
  expect(await stored.json()).toMatchObject({ state: { banner: labels } })
  expect(harness.api.requests).toHaveLength(reads)
  expect(
    (await harness.actor(workspace.id).api.github.stored())?.banner,
  ).toMatchObject(rawBranches)
})

it('stores masked GitHub update labels and preserves them in delivery receipt replay after restart', async () => {
  const { workspace, userId, orgId, session } = await labeledWorkspace()
  const actor = harness.actor(workspace.id)
  const snapshot = await harness.refresh(workspace, {
    deliveryId: 'masked-labels',
    userId,
  })
  if (!snapshot) throw new Error('Expected a GitHub snapshot')
  const saved = (await harness.inspect(workspace.id)).events.filter(
    ({ event }) => event.type === 'github.updated',
  )
  expect(saved).toEqual([
    expect.objectContaining({
      event: {
        ...githubUpdated(snapshot),
        banner: expect.objectContaining(labels),
      },
    }),
  ])
  const reads = harness.api.requests.length
  await harness.restart(workspace.id)
  await actor.api.peers.openBrowser('replay', {
    url: `${TEST_ORIGIN}${workspaceEventsPath(orgId, workspace.id)}`,
    headers: { Cookie: session },
  })
  await actor.api.peers.take('replay')
  await harness.refresh(workspace, { deliveryId: 'masked-labels', userId })
  expect(harness.api.requests).toHaveLength(reads)
  expect((await actor.api.peers.take('replay')).messages).toEqual([
    { type: 'event', envelope: saved[0] },
  ])
  await actor.api.peers.close('replay')
})

it('adds current masked labels to legacy GitHub history without changing its saved event or cursor', async () => {
  const { workspace, userId, orgId, session } = await labeledWorkspace(false)
  const actor = harness.actor(workspace.id)
  const snapshot = await harness.refresh(workspace, { userId })
  if (!snapshot) throw new Error('Expected a GitHub snapshot')
  const legacy = await actor.api.controls.emitEvent(
    workspace.id,
    githubUpdated(snapshot),
  )
  expect(legacy.event).toEqual(githubUpdated(snapshot))
  await captureSecret(workspace, userId)
  await harness.restart(workspace.id)
  await actor.api.peers.openBrowser('legacy', {
    url: `${TEST_ORIGIN}${workspaceEventsPath(orgId, workspace.id)}`,
    headers: { Cookie: session },
  })
  const messages = (await actor.api.peers.take('legacy')).messages
  const histories = messages.flatMap((message) =>
    message.type === 'history' ? [message.history] : [],
  )
  expect(histories).toEqual([
    expect.objectContaining({
      throughEventNumber: legacy.eventNumber,
      events: expect.arrayContaining([
        {
          ...legacy,
          event: {
            ...legacy.event,
            banner: expect.objectContaining(labels),
          },
        },
      ]),
    }),
  ])
  expect(
    (await actor.api.controls.history(workspace.id)).events.at(-1),
  ).toEqual(legacy)
  await actor.api.peers.close('legacy')
})
