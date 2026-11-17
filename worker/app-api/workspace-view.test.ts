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

it.each([
  { kind: 'file', path: 'README.md' },
  { kind: 'diff', path: 'src/app.ts' },
])(
  'keeps the temporary $kind tab through a save and a load',
  async (temporaryTab) => {
    const saved = await requestView('PUT', { ...view, temporaryTab })
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
  const saved = await requestView('PUT', view)
  expect(saved.status).toBe(200)
  expect(await saved.json()).toMatchObject({
    view: { ...view, temporaryTab: null },
  })
  await storeRawView(view)
  expect(await (await requestView()).json()).toMatchObject({
    view: { ...view, temporaryTab: null },
  })
})

it('keeps a valid terminal ID through saves and reads, including unknown IDs', async () => {
  for (const terminal of ['workspace', '0123456789abcdef0123456789abcdef']) {
    const expected = { ...view, temporaryTab: null, terminal }
    const saved = await requestView('PUT', { ...view, terminal })
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({ view: expected })
    expect(await (await requestView()).json()).toMatchObject({ view: expected })
    await storeRawView({ ...view, terminal })
    expect(await (await requestView()).json()).toMatchObject({ view: expected })
  }
})

it('drops invalid terminal IDs and accepts views without a terminal', async () => {
  for (const terminal of [
    undefined,
    null,
    2,
    'other',
    'A'.repeat(32),
    `${'a'.repeat(32)}\n`,
  ]) {
    const saved = await requestView('PUT', { ...view, terminal })
    expect(saved.status).toBe(200)
    const expected = { view: { ...view, temporaryTab: null } }
    const savedBody: unknown = await saved.json()
    expect(savedBody).toMatchObject(expected)
    expect(savedBody).not.toHaveProperty('view.terminal')
    await storeRawView({ ...view, terminal })
    const loaded = await requestView()
    const loadedBody: unknown = await loaded.json()
    expect(loadedBody).toMatchObject(expected)
    expect(loadedBody).not.toHaveProperty('view.terminal')
  }
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
    const saved = await requestView('PUT', { ...view, temporaryTab })
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
    const saved = await requestView('PUT', { ...view, temporaryTab })
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

it('keeps Preview tabs through a save and a load, apart from the tabs that older copies read', async () => {
  const withPreviews = {
    ...view,
    temporaryTab: null,
    activeTab: null,
    previewTabs: [
      { port: 3000, place: 1 },
      { port: 65535, place: 3 },
    ],
    activePreview: 3000,
  }
  const saved = await requestView('PUT', withPreviews)
  expect(saved.status).toBe(200)
  expect(await saved.json()).toMatchObject({ view: withPreviews })
  const loaded: unknown = await (await requestView()).json()
  expect(loaded).toMatchObject({ view: withPreviews })
  // An older copy reads `tabs` and `activeTab`, which hold no Preview tab.
  expect(JSON.stringify(loaded)).not.toContain('"kind":"preview"')
})

it('keeps the shown terminal next to Preview tabs through a save and a load', async () => {
  const withBoth = {
    ...view,
    temporaryTab: null,
    previewTabs: [{ port: 3000, place: 0 }],
    activePreview: null,
    terminal: 'workspace',
  }
  const saved = await requestView('PUT', withBoth)
  expect(saved.status).toBe(200)
  expect(await saved.json()).toMatchObject({ view: withBoth })
  expect(await (await requestView()).json()).toMatchObject({ view: withBoth })
})

it('keeps the stored Preview tabs when an older copy saves the view', async () => {
  await requestView('PUT', {
    ...view,
    previewTabs: [{ port: 3000, place: 0 }],
    activePreview: 3000,
  })
  // An older copy knows no Preview tab, so its save has no `previewTabs`.
  const older = { ...view, tabs: [tabs[1], tabs[0]], activeTab: tabs[1] }
  const saved = await requestView('PUT', older)
  expect(saved.status).toBe(200)
  expect(await (await requestView()).json()).toMatchObject({
    view: {
      ...older,
      previewTabs: [{ port: 3000, place: 0 }],
      activePreview: null,
    },
  })
})

it('refuses a Preview tab without a port from 1 to 65535 or a place', async () => {
  const wrong: readonly unknown[] = [
    [{ port: 0, place: 0 }],
    [{ port: 65536, place: 0 }],
    [{ port: 3000.5, place: 0 }],
    [{ port: '3000', place: 0 }],
    [{ port: 3000, place: -1 }],
    [{ port: 3000 }],
    'none',
  ]
  for (const previewTabs of wrong) {
    const saved = await requestView('PUT', { ...view, previewTabs })
    expect(saved.status, JSON.stringify(previewTabs)).toBe(400)
  }
  const active = await requestView('PUT', { ...view, activePreview: 0 })
  expect(active.status).toBe(400)
})
