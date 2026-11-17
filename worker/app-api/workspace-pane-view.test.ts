import { beforeEach, expect, it } from 'vitest'

import { workspaceViewPath } from '../../src/shared/workspace-view'
import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { saveCompatibleWorkspaceView } from './workspace-view-save'
import { workspaceViewInput } from './workspace-view'
import { interceptMembersWrite } from '../members/guarded-write.test-support'
import { seedWorkspace } from '../members/members-test-support'

const backendFixture = setupBackendTests()
const workspaceId = 'pane-view-workspace'
const session = { kind: 'session', sessionId: 'one' }
const file = { kind: 'file', path: 'README.md', mode: 'source' }
const diff = { kind: 'diff', path: 'src/app.ts' }
const added = { kind: 'file', path: 'new.ts', mode: 'source' }
const left = { tabs: [session, file], activeTab: session, temporaryTab: file }
const right = { tabs: [diff], activeTab: diff, temporaryTab: diff }
const split = {
  panes: [left, right],
  focusedPane: 1,
  fileList: 'changes',
  tool: 'preview',
}

beforeEach(async () => {
  const { harness, org, user, repositoryId } = backendFixture()
  await seedWorkspace(harness, org, user, workspaceId, repositoryId, null)
  await harness.env.DB.prepare(
    `INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id, session_id,
       first_turn_id, agent, model, effort, first_message_id)
     VALUES (?, ?, ?, 'pane-session', 'pane-turn', 'codex', 'gpt-5.5', 'high', 'pane-message')`,
  )
    .bind(workspaceId, org.id, user.id)
    .run()
})

function requestView(method = 'GET', body?: unknown) {
  const { harness, org, session: login } = backendFixture()
  return harness.request(workspaceViewPath(org.id, workspaceId), login, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

async function storeView(view: unknown) {
  const { harness, org, user } = backendFixture()
  await harness.env.DB.prepare(
    `INSERT INTO workspace_views (workspace_id, org_id, user_id, view_json, updated_at)
     VALUES (?, ?, ?, ?, 0)
     ON CONFLICT(workspace_id, user_id) DO UPDATE SET view_json = excluded.view_json`,
  )
    .bind(workspaceId, org.id, user.id, JSON.stringify(view))
    .run()
}

it('reads an old stored row as one pane without losing its tab order or marks', async () => {
  await storeView({ ...left, fileList: 'all', tool: 'terminal' })
  const response = await requestView()
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    view: {
      panes: [{ ...left, temporaryTab: { kind: 'file', path: 'README.md' } }],
      focusedPane: 0,
      ...left,
      temporaryTab: { kind: 'file', path: 'README.md' },
    },
  })
})

it('saves two panes and returns a row that an old app can read on PUT and GET', async () => {
  const saved = await requestView('PUT', split)
  expect(saved.status).toBe(200)
  const expected = {
    ...split,
    panes: [
      { ...left, temporaryTab: { kind: 'file', path: 'README.md' } },
      right,
    ],
    tabs: [session, file, diff],
    activeTab: diff,
    temporaryTab: diff,
  }
  expect(await saved.json()).toMatchObject({ view: expected })
  const loaded = await requestView()
  expect(loaded.status).toBe(200)
  expect(await loaded.json()).toMatchObject({ view: expected })
})

it('falls back to one pane with all tabs for wrong pane lists and focus indexes', async () => {
  for (const panes of [
    null,
    [],
    [left, right, left],
    [left, left],
    [left, {}],
  ]) {
    const response = await requestView('PUT', {
      ...split,
      panes,
      tabs: [session, file, diff],
      activeTab: diff,
      temporaryTab: diff,
    })
    expect(response.status, JSON.stringify(panes)).toBe(200)
    expect(await response.json()).toMatchObject({
      view: {
        panes: [
          { tabs: [session, file, diff], activeTab: diff, temporaryTab: diff },
        ],
        focusedPane: 0,
      },
    })
  }
  await storeView({ ...split, focusedPane: 7 })
  expect(await (await requestView()).json()).toMatchObject({
    view: { panes: [{ tabs: [session, file, diff] }], focusedPane: 0 },
  })
})

it('reorders each stored pane from an old save without changing ownership, selection, focus, or temporary tabs', async () => {
  const second = { kind: 'session', sessionId: 'two' }
  await storeView({
    ...split,
    panes: [left, { ...right, tabs: [diff, second] }],
  })
  const oldSave = {
    tabs: [added, second, file, diff, session],
    activeTab: file,
    temporaryTab: added,
    fileList: 'all',
    tool: 'terminal',
  }
  const saved = await requestView('PUT', oldSave)
  expect(saved.status).toBe(200)
  const expected = {
    panes: [
      {
        ...left,
        tabs: [file, session],
        temporaryTab: { kind: 'file', path: 'README.md' },
      },
      { ...right, tabs: [second, diff, added] },
    ],
    focusedPane: 1,
    tabs: [file, session, second, diff, added],
    activeTab: diff,
    temporaryTab: diff,
    fileList: 'all',
    tool: 'terminal',
  }
  expect(await saved.json()).toMatchObject({ view: expected })
  expect(await (await requestView()).json()).toMatchObject({ view: expected })
})

it('repairs a closed shown or temporary tab and closes an empty pane after an old save', async () => {
  await storeView(split)
  const saved = await requestView('PUT', {
    tabs: [added, file],
    activeTab: added,
    temporaryTab: added,
    fileList: 'all',
    tool: 'terminal',
  })
  expect(saved.status).toBe(200)
  expect(await saved.json()).toMatchObject({
    view: {
      panes: [
        {
          tabs: [file],
          activeTab: file,
          temporaryTab: { kind: 'file', path: 'README.md' },
        },
        { tabs: [added], activeTab: added, temporaryTab: null },
      ],
      focusedPane: 1,
    },
  })
  const closedPane = await requestView('PUT', {
    tabs: [file],
    activeTab: file,
    temporaryTab: null,
    fileList: 'all',
    tool: 'terminal',
  })
  expect(await closedPane.json()).toMatchObject({
    view: {
      panes: [
        {
          tabs: [file],
          activeTab: file,
          temporaryTab: { kind: 'file', path: 'README.md' },
        },
      ],
      focusedPane: 0,
    },
  })
  const empty = await requestView('PUT', {
    tabs: [],
    activeTab: null,
    temporaryTab: null,
    fileList: 'all',
    tool: 'terminal',
  })
  expect(await empty.json()).toMatchObject({
    view: {
      panes: [{ tabs: [], activeTab: null, temporaryTab: null }],
      focusedPane: 0,
    },
  })
})

it('drops a pane temporary mark that names a tab in the other pane', async () => {
  const response = await requestView('PUT', {
    ...split,
    panes: [{ ...left, temporaryTab: diff }, right],
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    view: { panes: [{ ...left, temporaryTab: null }, right] },
  })
})

it('fits an old save again when a concurrent pane save wins before its database write', async () => {
  await storeView({
    ...left,
    tabs: [session, file, diff],
    fileList: 'changes',
    tool: 'preview',
  })
  const { harness, org, user } = backendFixture()
  const intercepted = interceptMembersWrite(harness.env.DB, () =>
    storeView(split),
  )
  const saved = await saveCompatibleWorkspaceView(
    intercepted.db,
    {
      workspaceId,
      orgId: org.id,
      userId: user.id,
      now: 1,
      view: workspaceViewInput({
        tabs: [session, file, diff, added],
        activeTab: file,
        temporaryTab: added,
        fileList: 'all',
        tool: 'terminal',
      }),
    },
    true,
  )
  const expected = {
    panes: [
      { ...left, temporaryTab: { kind: 'file', path: 'README.md' } },
      { ...right, tabs: [diff, added] },
    ],
    focusedPane: 1,
  }
  expect(saved).toMatchObject(expected)
  expect(await (await requestView()).json()).toMatchObject({ view: expected })
})
