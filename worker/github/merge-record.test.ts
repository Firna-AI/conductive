import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { purgeOrgRecords } from '../members/purge-data'
import { TEST_TIME } from '../test-support/harness'
import { repositoryPull } from './fake-pull'
import { recordedPullRequest } from './recorded-webhooks'
import { createGitHubHarness, type GitHubTestHarness } from './test-harness'

const MERGED_AT = '2026-11-19T08:30:00Z'

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

async function merges() {
  const { results } = await harness.env.DB.prepare(
    `SELECT repository_id, number, org_id, workspace_id, owner_user_id,
      merged_at, recorded_at FROM pull_request_merges ORDER BY number`,
  ).all()
  return results
}

function mergedEvent(fields: Record<string, unknown> = {}) {
  return {
    ...recordedPullRequest,
    action: 'closed',
    pull_request: {
      ...recordedPullRequest.pull_request,
      merged: true,
      merged_at: MERGED_AT,
      ...fields,
    },
  }
}

async function addMember(orgId: string, id: string, githubId: number) {
  const db = harness.env.DB
  await db.batch([
    db
      .prepare(
        'INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES (?, ?, ?, 0, 0)',
      )
      .bind(id, githubId, id),
    db
      .prepare(
        "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'member', 0)",
      )
      .bind(orgId, id),
  ])
}

it('records a merged pull request once, for the owner at the first record', async () => {
  const fixture = await harness.seed()
  harness.api.pulls[2] = repositoryPull({
    state: 'MERGED',
    mergedAt: MERGED_AT,
  })
  await harness.refresh(fixture.workspace, {})
  const recorded = {
    repository_id: 186853002,
    number: 2,
    org_id: fixture.orgId,
    workspace_id: fixture.workspace.id,
    owner_user_id: fixture.userId,
    merged_at: Date.parse(MERGED_AT),
    recorded_at: TEST_TIME,
  }
  expect(await merges()).toEqual([recorded])
  // A later owner and a repeated read keep the first record.
  await addMember(fixture.orgId, 'later-owner', 99)
  await harness.env.DB.prepare(
    "UPDATE workspaces SET owner_user_id = 'later-owner' WHERE id = ?",
  )
    .bind(fixture.workspace.id)
    .run()
  await harness.refresh(fixture.workspace, {})
  expect(
    (await harness.webhook('pull_request', mergedEvent(), 'merged')).status,
  ).toBe(204)
  expect(await merges()).toEqual([recorded])
})

it('records nothing for an open pull request or a pull request that closed without a merge', async () => {
  const fixture = await harness.seed()
  await harness.refresh(fixture.workspace, {})
  harness.api.pulls[2] = repositoryPull({
    state: 'CLOSED',
    closedAt: MERGED_AT,
  })
  await harness.refresh(fixture.workspace, {})
  const closed = { ...mergedEvent({ merged: false }) }
  expect((await harness.webhook('pull_request', closed, 'closed')).status).toBe(
    204,
  )
  expect(await merges()).toEqual([])
})

it('records the merge of an archived workspace from the webhook, with no GitHub read', async () => {
  const fixture = await harness.seed()
  await harness.env.DB.prepare(
    "UPDATE workspaces SET state = 'archived', archived_at = ? WHERE id = ?",
  )
    .bind(TEST_TIME, fixture.workspace.id)
    .run()
  const reads = harness.api.requests.length
  expect(
    (await harness.webhook('pull_request', mergedEvent(), 'merged')).status,
  ).toBe(204)
  expect(harness.api.requests.length).toBe(reads)
  expect(await merges()).toMatchObject([
    {
      workspace_id: fixture.workspace.id,
      owner_user_id: fixture.userId,
      merged_at: Date.parse(MERGED_AT),
    },
  ])
})

it('uses the delivery time when the merged event has no merge time', async () => {
  const fixture = await harness.seed()
  await harness.env.DB.prepare(
    "UPDATE workspaces SET state = 'archived', archived_at = ? WHERE id = ?",
  )
    .bind(TEST_TIME, fixture.workspace.id)
    .run()
  const event = mergedEvent({ merged_at: null })
  expect((await harness.webhook('pull_request', event, 'merged')).status).toBe(
    204,
  )
  expect(await merges()).toMatchObject([{ merged_at: TEST_TIME }])
})

it('records nothing for a deleted org, and the org purge removes the merges', async () => {
  const fixture = await harness.seed()
  harness.api.pulls[2] = repositoryPull({
    state: 'MERGED',
    mergedAt: MERGED_AT,
  })
  await harness.refresh(fixture.workspace, {})
  expect(await merges()).toHaveLength(1)
  const db = harness.env.DB
  await db.batch([
    db
      .prepare('UPDATE orgs SET deleted_at = ? WHERE id = ?')
      .bind(TEST_TIME, fixture.orgId),
    db.prepare('DELETE FROM pull_request_merges'),
  ])
  await harness.webhook('pull_request', mergedEvent(), 'after-delete')
  expect(await merges()).toEqual([])
  await db.batch([
    db
      .prepare(
        `INSERT INTO pull_request_merges (repository_id, number, org_id,
          workspace_id, owner_user_id, merged_at, recorded_at)
        VALUES (1, 1, ?, ?, ?, 0, 0)`,
      )
      .bind(fixture.orgId, fixture.workspace.id, fixture.userId),
    db
      .prepare(
        `INSERT INTO org_deletions (org_id, purge_started_at, lease_token)
        VALUES (?, ?, 'lease')`,
      )
      .bind(fixture.orgId, TEST_TIME),
  ])
  expect(await purgeOrgRecords(db, fixture.orgId, 'lease')).toBe(true)
  expect(await merges()).toEqual([])
})
