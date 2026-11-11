import { expect, it } from 'vitest'

import {
  readOrderedWorkspaceResponse,
  readWorkspaces,
} from '../../src/app/api/read-workspaces'
import { sessionsPath } from '../../src/shared/sessions'
import { sectionsPath } from '../../src/shared/sections'
import {
  workspacePath,
  workspacePaths,
  workspacesPath,
} from '../../src/shared/workspaces'
import { listedWorkspaces } from '../../tools/responses'
import { createApp } from '../application'
import { beforeFirstListBatch } from '../app-api/shell-list.test-support'
import { orgWorkspaces } from '../tools/store'
import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { TEST_TIME } from '../test-support/harness'
import {
  insertVerifiedImportedWorkspace,
  type VerifiedImportedWorkspace,
} from './workspace-data'

const backendFixture = setupBackendTests()
function input(id = 'imported-workspace'): VerifiedImportedWorkspace {
  const fixture = backendFixture()
  return {
    id,
    orgId: fixture.org.id,
    repositoryId: fixture.repositoryId,
    importer: fixture.user,
    localWorkspaceId: 'conductor-local-id',
    name: 'Transferred work',
    branch: 'owner/continued',
    choice: { agent: 'codex', model: 'test-model', effort: 'high' },
    now: TEST_TIME,
  }
}

function request(
  path: string,
  method = 'GET',
  body?: unknown,
  nativeWorkspaceId?: string,
) {
  const fixture = backendFixture()
  const value = new Request(`${fixture.runtime.env.APP_ORIGIN}${path}`, {
    method,
    headers: {
      Cookie: fixture.session,
      Origin: fixture.runtime.env.APP_ORIGIN,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  if (nativeWorkspaceId) {
    fixture.runtime.workspace(nativeWorkspaceId)
    const actor = fixture.actors.get(nativeWorkspaceId)
    if (!actor) throw new Error('Missing native workspace')
    return actor.native.fetch(value)
  }
  return createApp(fixture.runtime.dependencies).fetch(
    value,
    fixture.runtime.env,
  )
}

it('publishes a numbered Not active workspace with no first chat identity or computer through list and read routes', async () => {
  const fixture = backendFixture()
  const source = input()
  const inserted = await insertVerifiedImportedWorkspace(
    fixture.runtime.env.DB,
    source,
  )
  expect(inserted?.state).toBe('inactive')
  if (!inserted) throw new Error('Missing imported record')
  const listed = await request(workspacesPath(source.orgId))
  expect(listed.status).toBe(200)
  const workspace = readWorkspaces(await listed.json())[0]
  expect(workspace).toMatchObject({
    id: source.id,
    number: 1,
    owner: { id: source.importer.id },
    name: source.name,
    branch: source.branch,
    state: 'inactive',
    conductorImport: {
      localWorkspaceId: source.localWorkspaceId,
      importerUserId: source.importer.id,
      activatedAt: null,
    },
  })
  const opened = await request(workspacePath(source.orgId, source.id))
  expect(opened.status).toBe(200)
  expect(readOrderedWorkspaceResponse(await opened.json())).toMatchObject({
    workspace,
    eventNumber: 0,
    start: null,
    error: null,
  })
  expect(
    await (
      await request(
        sessionsPath(source.orgId, source.id),
        'GET',
        undefined,
        source.id,
      )
    ).json(),
  ).toEqual({
    eventNumber: 0,
    sessions: [],
    history: [],
  })
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT session_id AS session, first_turn_id AS turn, first_message_id AS message FROM workspace_runtime WHERE workspace_id = ?',
    )
      .bind(source.id)
      .first(),
  ).toEqual({ session: null, turn: null, message: null })
  expect(fixture.boat.starts).toEqual([])
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspace_tokens',
    ).first('count'),
  ).toBe(0)
  expect(
    listedWorkspaces({
      workspaces: await orgWorkspaces(
        fixture.runtime.env.DB,
        source.orgId,
        fixture.runtime.env.APP_ORIGIN,
      ),
    }).workspaces[0].state,
  ).toBe('inactive')
  const blocked = await request(
    sessionsPath(source.orgId, source.id),
    'POST',
    {
      choice: source.choice,
    },
    source.id,
  )
  expect(blocked.status).toBe(409)
  expect(await blocked.json()).toMatchObject({
    error: { code: 'workspace_not_active' },
  })
})

it('deduplicates concurrent source records and keeps import identity after Archive', async () => {
  const fixture = backendFixture()
  const source = input()
  const [first, second] = await Promise.all([
    insertVerifiedImportedWorkspace(fixture.runtime.env.DB, source),
    insertVerifiedImportedWorkspace(fixture.runtime.env.DB, {
      ...source,
      id: 'other-candidate',
    }),
  ])
  expect(first?.state).toBe('inactive')
  expect(second?.id).toBe(first?.id)
  if (!first) throw new Error('Missing imported record')
  const sections = await request(sectionsPath(source.orgId))
  expect(await sections.json()).toMatchObject({
    sections: [
      { id: first.sectionId, name: 'Import from Conductor', isDefault: false },
      { name: 'General', isDefault: true },
    ],
  })
  const archived = await request(
    workspacePaths.archive(source.orgId, first.id),
    'POST',
    {},
  )
  expect(archived.status).toBe(200)
  const shown = readOrderedWorkspaceResponse(
    await (await request(workspacePath(source.orgId, first.id))).json(),
  )
  expect(shown.workspace).toMatchObject({
    number: 1,
    state: 'archived',
    conductorImport: {
      localWorkspaceId: source.localWorkspaceId,
      importerUserId: source.importer.id,
      activatedAt: null,
    },
  })
  expect(fixture.boat.starts).toEqual([])
  expect(fixture.boat.deletedIds).toEqual([])
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT workspace_number_count FROM orgs WHERE id = ?',
    )
      .bind(source.orgId)
      .first('workspace_number_count'),
  ).toBe(1)
  await fixture.runtime.env.DB.prepare(
    'UPDATE sections SET name = ? WHERE id = ?',
  )
    .bind('Renamed imports', first.sectionId)
    .run()
  const repeated = await insertVerifiedImportedWorkspace(
    fixture.runtime.env.DB,
    {
      ...source,
      id: 'repeated-candidate',
    },
  )
  expect(repeated.id).toBe(first.id)
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM sections WHERE org_id = ?',
    )
      .bind(source.orgId)
      .first('count'),
  ).toBe(2)
})

it('refuses a suspended publication without a workspace, section, or allocated number', async () => {
  const fixture = backendFixture()
  const source = input()
  const db = fixture.runtime.env.DB
  const race = beforeFirstListBatch(db, async () => {
    await db
      .prepare('UPDATE orgs SET suspended_at = ? WHERE id = ?')
      .bind(TEST_TIME, source.orgId)
      .run()
  })
  await expect(
    insertVerifiedImportedWorkspace(race.db, source),
  ).rejects.toMatchObject({ code: 'org_suspended' })
  expect(
    await db.prepare('SELECT COUNT(*) AS count FROM workspaces').first('count'),
  ).toBe(0)
  expect(
    await db
      .prepare(
        "SELECT COUNT(*) AS count FROM sections WHERE name = 'Import from Conductor'",
      )
      .first('count'),
  ).toBe(0)
  expect(
    await db
      .prepare('SELECT workspace_number_count FROM orgs WHERE id = ?')
      .bind(source.orgId)
      .first('workspace_number_count'),
  ).toBe(0)
})
