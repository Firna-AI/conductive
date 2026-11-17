import { beforeEach, expect, it } from 'vitest'

import {
  workspaceViewPath,
  type WorkspaceTab,
} from '../../src/shared/workspace-view'
import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { seedWorkspace } from '../members/members-test-support'

const backendFixture = setupBackendTests()
const workspaceId = 'saved-view-workspace'
const tabs: readonly WorkspaceTab[] = [
  { kind: 'file', path: 'README.md', mode: 'preview' },
  { kind: 'diff', path: 'src/app.ts' },
]
const view = {
  tabs,
  activeTab: tabs[0],
  fileList: 'all',
  tool: 'terminal',
}

beforeEach(async () => {
  const fixture = backendFixture()
  await seedWorkspace(
    fixture.harness,
    fixture.org,
    fixture.user,
    workspaceId,
    fixture.repositoryId,
    null,
  )
  await seedRuntime()
})

async function seedRuntime() {
  const { harness, org, user } = backendFixture()
  await harness.env.DB.prepare(
    `INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id, session_id,
       first_turn_id, agent, model, effort, first_message_id)
     VALUES (?, ?, ?, 'view-session', 'view-turn', 'codex', 'gpt-5.5', 'high', 'view-message')`,
  )
    .bind(workspaceId, org.id, user.id)
    .run()
}

function requestView(method = 'GET', body?: unknown) {
  const { harness, org, session } = backendFixture()
  return harness.request(workspaceViewPath(org.id, workspaceId), session, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

async function storeRawView(value: unknown) {
  const { harness, org, user } = backendFixture()
  await harness.env.DB.prepare(
    `INSERT INTO workspace_views (workspace_id, org_id, user_id, view_json, updated_at)
     VALUES (?, ?, ?, ?, 0)
     ON CONFLICT(workspace_id, user_id) DO UPDATE SET view_json = excluded.view_json`,
  )
    .bind(workspaceId, org.id, user.id, JSON.stringify(value))
    .run()
}

it('replaces one stored pane with an old saves order, shown tab, and temporary tab', async () => {
  await storeRawView({
    panes: [{ ...view, temporaryTab: tabs[0] }],
    focusedPane: 0,
    fileList: view.fileList,
    tool: view.tool,
  })
  const oldSave = {
    ...view,
    tabs: [tabs[1], tabs[0]],
    activeTab: tabs[1],
    temporaryTab: tabs[1],
  }
  const saved = await requestView('PUT', oldSave)
  expect(saved.status).toBe(200)
  const expected = {
    ...oldSave,
    panes: [
      {
        tabs: [tabs[1], tabs[0]],
        activeTab: tabs[1],
        temporaryTab: tabs[1],
      },
    ],
    focusedPane: 0,
  }
  expect(await saved.json()).toMatchObject({ view: expected })
  const loaded = await requestView()
  expect(loaded.status).toBe(200)
  expect(await loaded.json()).toMatchObject({ view: expected })
})

it.each([
  { kind: 'file', path: 'README.md' },
  { kind: 'diff', path: 'src/app.ts' },
])(
  'keeps the temporary $kind tab through a save and a load',
  async (temporaryTab) => {
    const saved = await requestView('PUT', {
      fileList: view.fileList,
      tool: view.tool,
      panes: [{ ...view, temporaryTab }],
      focusedPane: 0,
    })
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({
      view: { ...view, temporaryTab },
    })
    const loaded = await requestView()
    expect(loaded.status).toBe(200)
    expect(await loaded.json()).toMatchObject({
      view: { ...view, temporaryTab },
    })
  },
)

it('returns no temporary tab for a new view and for older saved views', async () => {
  expect(await (await requestView()).json()).toMatchObject({
    view: { tabs: [], activeTab: null, temporaryTab: null },
  })
  const saved = await requestView('PUT', {
    fileList: view.fileList,
    tool: view.tool,
    panes: [{ ...view, temporaryTab: null }],
    focusedPane: 0,
  })
  expect(saved.status).toBe(200)
  expect(await saved.json()).toMatchObject({
    view: { ...view, temporaryTab: null },
  })
  await storeRawView(view)
  expect(await (await requestView()).json()).toMatchObject({
    view: { ...view, temporaryTab: null },
  })
})

it('accepts invalid temporary marks and loads them as null', async () => {
  const marks: readonly unknown[] = [
    null,
    'README.md',
    [],
    {},
    { kind: 'session', sessionId: 'session-one' },
    { kind: 'file', path: '' },
    { kind: 'file', path: 42 },
    { kind: 'diff' },
  ]
  for (const temporaryTab of marks) {
    const saved = await requestView('PUT', {
      fileList: view.fileList,
      tool: view.tool,
      panes: [{ ...view, temporaryTab }],
      focusedPane: 0,
    })
    expect(saved.status, JSON.stringify(temporaryTab)).toBe(200)
    expect(await saved.json()).toMatchObject({
      view: { ...view, temporaryTab: null },
    })
    await storeRawView({ ...view, temporaryTab })
    expect(await (await requestView()).json()).toMatchObject({
      view: { ...view, temporaryTab: null },
    })
  }
})

it('loads a mark with no matching open kind and path as null', async () => {
  for (const temporaryTab of [
    { kind: 'file', path: 'closed.ts' },
    { kind: 'diff', path: 'README.md' },
  ]) {
    const saved = await requestView('PUT', {
      fileList: view.fileList,
      tool: view.tool,
      panes: [{ ...view, temporaryTab }],
      focusedPane: 0,
    })
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({
      view: { ...view, temporaryTab: null },
    })
    await storeRawView({ ...view, temporaryTab })
    expect(await (await requestView()).json()).toMatchObject({
      view: { ...view, temporaryTab: null },
    })
  }
})
