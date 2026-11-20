import { expect, it } from 'vitest'

import { interceptMembersWrite } from '../members/guarded-write.test-support'
import { readBuildJob } from '../lifecycle/build-data'
import { TEST_TIME } from '../test-support/harness'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { FIRST_MESSAGE } from '../lifecycle/durable-test-support'
import { SOFTWARE } from '../lifecycle/backend-test-support'
import { createWorkspace } from '../lifecycle/workspaces'
import { advanceImageBuild, startImageBuild } from '../lifecycle/image-builds'
import { readImageSettings } from '../lifecycle/settings-data'
import { readOrgImage } from '../lifecycle/org-image-data'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { refreshImagesForPush, runImageAlarm } from '../lifecycle/image-timers'
import {
  authenticateWorkspaceToken,
  storeWorkspaceToken,
} from '../lifecycle/tokens'
import { existingWorkspace, joinedMember } from './suspension-test-support'
import { suspendOrg } from './suspend-org'

const backendFixture = setupBackendTests()

it('stops every org owner and refuses new starts, token replacement, builds, and automatic refreshes', async () => {
  const fixture = backendFixture()
  const colleague = await joinedMember(fixture)
  const first = await existingWorkspace(fixture, 'org-first')
  const second = await existingWorkspace(fixture, 'org-second', colleague)
  await storeWorkspaceToken(fixture.runtime.env, first.id, 'first-token', 0)
  await storeWorkspaceToken(fixture.runtime.env, second.id, 'second-token', 0)
  for (const [index, workspace] of [first, second].entries())
    await fixture.runtime.env.DB.prepare(
      `INSERT INTO preview_hostnames (id, hostname, org_id, workspace_id, port, created_at, expires_at)
       VALUES (?, ?, ?, ?, 3000, 0, ?)`,
    )
      .bind(
        `preview-${workspace.id}`,
        String(index + 1).repeat(32),
        fixture.org.id,
        workspace.id,
        TEST_TIME + 60000,
      )
      .run()

  await fixture.runtime.env.DB.prepare(
    'UPDATE org_images SET pending_push_refresh_at = 1 WHERE org_id = ? AND provider_account = ?',
  )
    .bind(fixture.org.id, DEFAULT_PROVIDER_ACCOUNT)
    .run()
  const before = await readImageSettings(fixture.runtime.env.DB, fixture.org.id)
  const beforeImage = await readOrgImage(
    fixture.runtime.env.DB,
    fixture.org.id,
    'boat',
  )

  const beforeStops: { tokens: number; previews: number }[] = []
  const runtime = {
    ...fixture.runtime,
    workspace: (id: string) => {
      const endpoint = fixture.runtime.workspace(id)
      return {
        ...endpoint,
        suspendLifecycle: async (workspaceId: string, ownerId: string) => {
          const tokens = await fixture.runtime.env.DB.prepare(
            'SELECT COUNT(*) AS n FROM workspace_tokens WHERE revoked_at IS NULL',
          ).first<number>('n')
          const previews = await fixture.runtime.env.DB.prepare(
            'SELECT COUNT(*) AS n FROM preview_hostnames WHERE revoked_at IS NULL',
          ).first<number>('n')
          if (tokens === null || previews === null)
            throw new Error('Missing resource counts')
          beforeStops.push({ tokens, previews })
          return endpoint.suspendLifecycle(workspaceId, ownerId)
        },
      }
    },
  }
  expect(
    await suspendOrg(runtime, fixture.org.id, fixture.user.id),
  ).toMatchObject({ pendingWorkspaceIds: [] })
  expect(beforeStops).toEqual([
    { tokens: 0, previews: 0 },
    { tokens: 0, previews: 0 },
  ])
  expect(fixture.boat.stopIds).toEqual(['bx_1', 'bx_2'])
  await expect(
    authenticateWorkspaceToken(fixture.runtime.env, 'first-token'),
  ).rejects.toMatchObject({ code: 'workspace_token_refused' })
  await expect(
    authenticateWorkspaceToken(fixture.runtime.env, 'second-token'),
  ).rejects.toMatchObject({ code: 'workspace_token_refused' })
  await expect(
    storeWorkspaceToken(fixture.runtime.env, first.id, 'replacement', 1),
  ).rejects.toMatchObject({ code: 'org_suspended' })
  await expect(
    createWorkspace(fixture.runtime, fixture.org.id, colleague, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  ).rejects.toMatchObject({ status: 403, code: 'org_suspended' })
  await expect(
    startImageBuild(fixture.images, {
      orgId: fixture.org.id,
      userId: fixture.user.id,
      kind: 'build',
      software: SOFTWARE,
    }),
  ).rejects.toMatchObject({ status: 403, code: 'org_suspended' })
  await expect(
    startImageBuild(fixture.images, {
      orgId: fixture.org.id,
      userId: fixture.user.id,
      kind: 'refresh',
      software: SOFTWARE,
    }),
  ).rejects.toMatchObject({ status: 403, code: 'org_suspended' })
  await expect(
    refreshImagesForPush(fixture.images, {
      githubRepositoryId: 1,
      ref: 'refs/heads/main',
      software: SOFTWARE,
    }),
  ).resolves.toEqual([])
  const schedules = fixture.scheduled.length
  await runImageAlarm(fixture.images, {
    orgId: fixture.org.id,
    software: SOFTWARE,
    buildId: null,
    nextAt: 0,
  })
  expect(fixture.scheduled).toHaveLength(schedules)
  expect(
    await readImageSettings(fixture.runtime.env.DB, fixture.org.id),
  ).toEqual(before)
  expect(
    await readOrgImage(fixture.runtime.env.DB, fixture.org.id, 'boat'),
  ).toEqual(beforeImage)
  expect(fixture.boat.starts).toHaveLength(2)
  expect(fixture.boat.resumeIds).toEqual([])
  const database = fixture.runtime.env.DB
  await database
    .prepare('UPDATE orgs SET suspended_at = NULL WHERE id = ?')
    .bind(fixture.org.id)
    .run()
  fixture.runtime.env.DB = interceptMembersWrite(database, async () => {
    await database
      .prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
      .bind(fixture.org.id)
      .run()
  }).db
  try {
    await expect(
      refreshImagesForPush(fixture.images, {
        githubRepositoryId: 1,
        ref: 'refs/heads/main',
        software: SOFTWARE,
      }),
    ).resolves.toEqual([])
  } finally {
    fixture.runtime.env.DB = database
  }
  expect(await readImageSettings(database, fixture.org.id)).toEqual(before)
  expect(await readOrgImage(database, fixture.org.id, 'boat')).toEqual(
    beforeImage,
  )
})

it('does not admit a build or replace a token when org suspension wins its database write', async () => {
  const fixture = backendFixture()
  const { env } = fixture.runtime
  const workspace = await existingWorkspace(fixture, 'token-race')
  await storeWorkspaceToken(env, workspace.id, 'before-race', 0)
  await env.DB.prepare(
    'UPDATE workspace_tokens SET revoked_at = 1 WHERE workspace_id = ?',
  )
    .bind(workspace.id)
    .run()
  const database = env.DB
  const suspend = async () => {
    await database
      .prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
      .bind(fixture.org.id)
      .run()
  }
  env.DB = interceptMembersWrite(database, suspend).db
  try {
    await expect(
      storeWorkspaceToken(env, workspace.id, 'late-token', 2),
    ).rejects.toMatchObject({ code: 'org_suspended' })
  } finally {
    env.DB = database
  }
  expect(
    await database
      .prepare('SELECT revoked_at FROM workspace_tokens WHERE workspace_id = ?')
      .bind(workspace.id)
      .first('revoked_at'),
  ).toBe(1)
  await database
    .prepare('UPDATE orgs SET suspended_at = NULL WHERE id = ?')
    .bind(fixture.org.id)
    .run()
  env.DB = interceptMembersWrite(database, suspend).db
  try {
    await expect(
      startImageBuild(fixture.images, {
        orgId: fixture.org.id,
        userId: fixture.user.id,
        kind: 'build',
        software: SOFTWARE,
      }),
    ).rejects.toMatchObject({ code: 'org_suspended' })
  } finally {
    env.DB = database
  }
  expect(
    await database
      .prepare(
        "SELECT COUNT(*) AS n FROM image_builds WHERE state = 'running' AND org_id = ?",
      )
      .bind(fixture.org.id)
      .first('n'),
  ).toBe(0)
})

it('refuses image publication when org suspension wins the final database write', async () => {
  const fixture = backendFixture()
  const { env } = fixture.runtime
  const buildId = await startImageBuild(fixture.images, {
    orgId: fixture.org.id,
    userId: fixture.user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await advanceImageBuild(fixture.images, fixture.org.id, buildId)
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE image_build_jobs SET phase = 'publish' WHERE build_id = ?",
    ).bind(buildId),
    env.DB.prepare(
      "UPDATE image_builds SET snapshot_name = 'late-snapshot' WHERE id = ?",
    ).bind(buildId),
  ])
  const database = env.DB
  env.DB = interceptMembersWrite(database, async () => {
    await database
      .prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
      .bind(fixture.org.id)
      .run()
  }).db
  try {
    await advanceImageBuild(fixture.images, fixture.org.id, buildId)
  } finally {
    env.DB = database
  }
  expect(await readOrgImage(database, fixture.org.id, 'boat')).toMatchObject({
    imageName: 'last-good-image',
    imageBuildId: 'published-image',
  })
  expect(await readBuildJob(database, fixture.org.id, buildId)).toMatchObject({
    state: 'failed',
    phase: 'done',
  })
})
