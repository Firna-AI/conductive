import { afterEach, beforeAll, expect, it } from 'vitest'

import { readWorkspaces } from '../../../src/app/api/read-workspaces'
import { membersPath } from '../../../src/shared/members'
import { orgSettingsPaths } from '../../../src/shared/org-settings'
import { sectionsPath } from '../../../src/shared/sections'
import { workspaceViewPath } from '../../../src/shared/workspace-view'
import {
  workspacePath,
  workspacePaths,
  workspacesPath,
} from '../../../src/shared/workspaces'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from './outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_SECTION,
  OUTER_WORKSPACE,
} from './outer-seed.test-support'
import { seedShellWorkspaceRuntime } from './shell-api.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('serves real shell lists and keeps workspace views private to each member', async () => {
  fixture = await createOuterRuntime(bundle)
  await seedShellWorkspaceRuntime(fixture)
  await fixture.env.DB.prepare(
    `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch)
     VALUES ('unavailable-repository', ?, 909, 'owner/unavailable', 'main')`,
  )
    .bind(OUTER_ORG)
    .run()
  await fixture.env.DB.prepare(
    `INSERT INTO section_preferences (org_id, section_id, user_id, collapsed)
     VALUES (?, ?, 'owner', 1)`,
  )
    .bind(OUTER_ORG, OUTER_SECTION)
    .run()
  const listed = await fixture.request(workspacesPath(OUTER_ORG))
  expect(listed.status).toBe(200)
  expect(
    readWorkspaces(await listed.json()).map(({ id, state }) => ({ id, state })),
  ).toEqual([
    { id: 'workspace one', state: 'ready' },
    { id: 'workspace two', state: 'ready' },
  ])
  const sections = await fixture.request(sectionsPath(OUTER_ORG))
  expect(sections.status).toBe(200)
  expect(await sections.json()).toEqual({
    sections: [
      {
        id: OUTER_SECTION,
        orgId: OUTER_ORG,
        name: 'General',
        position: 0,
        isDefault: true,
        collapsed: true,
      },
    ],
  })
  const repositories = await fixture.request(
    orgSettingsPaths.repositories(OUTER_ORG),
  )
  expect(repositories.status).toBe(200)
  expect(await repositories.json()).toEqual({
    repositories: [
      {
        id: 'chat-repository',
        orgId: OUTER_ORG,
        githubId: 101,
        fullName: 'owner/repository',
        description: '',
        defaultBranch: 'main',
        installationId: 91,
        selected: true,
      },
    ],
  })
  expect((await fixture.request(membersPath(OUTER_ORG))).status).toBe(200)
  const path = workspaceViewPath(OUTER_ORG, OUTER_WORKSPACE)
  const view = {
    tabs: [{ kind: 'session', sessionId: 'first-session' }],
    activeTab: { kind: 'session', sessionId: 'first-session' },
    fileList: 'changes',
    temporaryTab: null,
    tool: 'preview',
  }
  const saved = await fixture.request(path, {
    method: 'PUT',
    body: JSON.stringify(view),
  })
  expect(saved.status).toBe(200)
  expect(await saved.json()).toEqual({
    view,
    routine: null,
    baseBranch: 'main',
  })
  expect(await (await fixture.request(path)).json()).toEqual({
    view,
    routine: null,
    baseBranch: 'main',
  })
  expect(
    await (
      await fixture.request(path, {
        headers: { Cookie: fixture.cookies.memberCookie },
      })
    ).json(),
  ).toEqual({
    view: {
      tabs: [],
      activeTab: null,
      temporaryTab: null,
      fileList: 'all',
      tool: 'terminal',
    },
    routine: null,
    baseBranch: 'main',
  })
  const outsider = await fixture.request(path, {
    headers: { Cookie: fixture.cookies.outsiderCookie },
  })
  expect(outsider.status).toBe(404)
  expect(await outsider.json()).toMatchObject({
    error: { code: 'org_not_found' },
  })
  const wrongWorkspace = await fixture.request(
    workspaceViewPath('other-org', OUTER_WORKSPACE),
    {
      headers: { Cookie: fixture.cookies.outsiderCookie },
    },
  )
  expect(wrongWorkspace.status).toBe(404)
  expect(await wrongWorkspace.json()).toMatchObject({
    error: { code: 'workspace_not_found' },
  })
})

it('decodes opaque workspace IDs for lifecycle reads and keeps archived writes read-only', async () => {
  fixture = await createOuterRuntime(bundle)
  await seedShellWorkspaceRuntime(fixture)
  const detail = await fixture.request(
    workspacePath(OUTER_ORG, OUTER_WORKSPACE),
  )
  expect(detail.status).toBe(200)
  expect(await detail.json()).toMatchObject({
    eventNumber: 0,
    workspace: { id: OUTER_WORKSPACE },
    start: null,
    error: null,
  })
  const resumed = await fixture.request(
    workspacePaths.resume(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: '{}' },
  )
  expect(resumed.status).toBe(200)
  expect(await resumed.json()).toMatchObject({
    eventNumber: 0,
    workspace: { id: OUTER_WORKSPACE },
  })
  await fixture.env.DB.prepare(
    `UPDATE workspaces SET archived_at = 1, state = 'archived' WHERE id = ?`,
  )
    .bind(OUTER_WORKSPACE)
    .run()
  const viewPath = workspaceViewPath(OUTER_ORG, OUTER_WORKSPACE)
  expect((await fixture.request(viewPath)).status).toBe(200)
  const saved = await fixture.request(viewPath, {
    method: 'PUT',
    body: JSON.stringify({
      tabs: [],
      activeTab: null,
      temporaryTab: null,
      fileList: 'all',
      tool: 'terminal',
    }),
  })
  expect(saved.status).toBe(409)
  expect(await saved.json()).toMatchObject({
    error: { code: 'workspace_archived' },
  })
  const activity = await fixture.request(
    workspacePaths.activity(OUTER_ORG, OUTER_WORKSPACE),
    {
      method: 'POST',
      body: JSON.stringify({ source: 'input' }),
    },
  )
  expect(activity.status).toBe(409)
  expect(await activity.json()).toMatchObject({
    error: { code: 'workspace_archived' },
  })
})
