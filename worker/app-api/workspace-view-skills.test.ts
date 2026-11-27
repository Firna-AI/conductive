import { beforeEach, expect, it } from 'vitest'

import { workspaceViewPath } from '../../src/shared/workspace-view'
import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { interceptMembersWrite } from '../members/guarded-write.test-support'
import { seedWorkspace } from '../members/members-test-support'

const backendFixture = setupBackendTests()
const workspaceId = 'saved-skill-tabs'
const file = { kind: 'file', path: 'README.md', mode: 'preview' }
const session = { kind: 'session', sessionId: 'session' }
const kept = { agent: 'claude', name: 'release' }
const temporary = { agent: 'codex', name: 'release' }
const base = {
  tabs: [session, file],
  activeTab: null,
  temporaryTab: null,
  fileList: 'all',
  tool: 'terminal',
}
const withSkills = {
  ...base,
  skillTabs: [
    { ...kept, place: 1 },
    { ...temporary, place: 3 },
  ],
  activeSkill: temporary,
  temporarySkill: temporary,
}

beforeEach(async () => {
  const { harness, org, user, repositoryId } = backendFixture()
  await seedWorkspace(harness, org, user, workspaceId, repositoryId, null)
  await harness.env.DB.prepare(
    `INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id, session_id,
       first_turn_id, agent, model, effort, first_message_id)
     VALUES (?, ?, ?, 'session', 'turn', 'codex', 'gpt-5.5', 'high', 'message')`,
  )
    .bind(workspaceId, org.id, user.id)
    .run()
})

function requestView(body?: unknown) {
  const { harness, org, session } = backendFixture()
  return harness.request(workspaceViewPath(org.id, workspaceId), session, {
    ...(body === undefined
      ? {}
      : { method: 'PUT', body: JSON.stringify(body) }),
  })
}

it('stores skill tabs separately and keeps them when an older app saves its view', async () => {
  const withPreview = {
    ...withSkills,
    skillTabs: [
      { ...kept, place: 1 },
      { ...temporary, place: 4 },
    ],
    previewTabs: [{ port: 3000, place: 1 }],
    activePreview: null,
  }
  const saved = await requestView(withPreview)
  expect(saved.status).toBe(200)
  expect(await saved.json()).toMatchObject({ view: withPreview })
  expect(await (await requestView()).json()).toMatchObject({
    view: withPreview,
  })

  const { harness, user } = backendFixture()
  const row = await harness.env.DB.prepare(
    'SELECT view_json AS json FROM workspace_views WHERE workspace_id = ? AND user_id = ?',
  )
    .bind(workspaceId, user.id)
    .first<{ json: string }>()
  expect(JSON.parse(row?.json ?? 'null')).toEqual({
    ...withSkills,
    tabs: [session, { kind: 'preview', port: 3000 }, file],
    skillTabs: withPreview.skillTabs,
    skillBaseTabs: [session, { kind: 'preview', port: 3000 }, file],
  })

  const olderView = { ...base, activeTab: file }
  const olderSave = await requestView(olderView)
  expect(olderSave.status).toBe(200)
  expect(await (await requestView()).json()).toMatchObject({
    view: { ...withPreview, ...olderView, activeSkill: null },
  })
  const cleared = await requestView({ ...olderView, skillTabs: [] })
  expect(cleared.status).toBe(200)
  expect(await (await requestView()).json()).not.toHaveProperty(
    'view.skillTabs',
  )
})

it('closes only the temporary skill when an older app saves a temporary file', async () => {
  const first = await requestView(withSkills)
  expect(first.status).toBe(200)
  const temporaryTab = { kind: 'file', path: file.path }
  const olderView = { ...base, activeTab: file, temporaryTab }
  const saved = await requestView(olderView)
  expect(saved.status).toBe(200)
  expect(await saved.json()).toMatchObject({
    view: {
      ...olderView,
      skillTabs: [{ ...kept, place: 1 }],
      activeSkill: null,
      temporarySkill: null,
    },
  })
  expect(await (await requestView()).json()).toMatchObject({
    view: {
      temporaryTab,
      skillTabs: [{ ...kept, place: 1 }],
      temporarySkill: null,
    },
  })
})

it('uses the skill tabs from a concurrent save when an older app saves a temporary file', async () => {
  expect((await requestView(withSkills)).status).toBe(200)
  const keptDuringSave = { agent: 'claude', name: 'review' }
  const temporaryDuringSave = { agent: 'codex', name: 'review' }
  const { harness } = backendFixture()
  const database = harness.env.DB
  const race = interceptMembersWrite(database, async () => {
    const current = await requestView({
      ...base,
      previewTabs: [],
      skillTabs: [
        { ...temporaryDuringSave, place: 1 },
        { ...keptDuringSave, place: 2 },
      ],
      activeSkill: temporaryDuringSave,
      temporarySkill: temporaryDuringSave,
    })
    expect(current.status).toBe(200)
  })
  harness.env.DB = race.db
  try {
    const olderView = {
      ...base,
      activeTab: file,
      temporaryTab: { kind: 'file', path: file.path },
    }
    const saved = await requestView(olderView)
    expect(saved.status).toBe(200)
    expect(race.calls()).toBe(1)
    const expected = {
      view: {
        ...olderView,
        skillTabs: [{ ...keptDuringSave, place: 1 }],
        activeSkill: null,
        temporarySkill: null,
      },
    }
    expect(await saved.json()).toMatchObject(expected)
    expect(await (await requestView()).json()).toMatchObject(expected)
  } finally {
    harness.env.DB = database
  }
})

it('keeps each skill beside the surviving tabs when an older app closes and reopens a file at the end', async () => {
  const next = { kind: 'session', sessionId: 'next' }
  const saved = await requestView({
    ...withSkills,
    tabs: [session, file, next],
    skillTabs: [
      { ...kept, place: 2 },
      { ...temporary, place: 4 },
    ],
  })
  expect(saved.status).toBe(200)
  const olderView = { ...base, tabs: [session, next] }
  const olderSave = await requestView(olderView)
  expect(olderSave.status).toBe(200)
  const expected = {
    view: {
      ...olderView,
      skillTabs: [
        { ...kept, place: 1 },
        { ...temporary, place: 3 },
      ],
      activeSkill: temporary,
      temporarySkill: temporary,
    },
  }
  expect(await olderSave.json()).toMatchObject(expected)
  expect(await (await requestView()).json()).toMatchObject(expected)

  const reopenedView = { ...olderView, tabs: [session, next, file] }
  const reopened = await requestView(reopenedView)
  expect(reopened.status).toBe(200)
  const afterReopen = {
    view: {
      ...reopenedView,
      skillTabs: [
        { ...kept, place: 1 },
        { ...temporary, place: 3 },
      ],
      activeSkill: temporary,
      temporarySkill: temporary,
    },
  }
  expect(await reopened.json()).toMatchObject(afterReopen)
  expect(await (await requestView()).json()).toMatchObject(afterReopen)
})

it('leaves a skill tab kept when its temporary mark is invalid or names a closed skill', async () => {
  for (const temporarySkill of [
    'release',
    { agent: 'codex', name: 'closed' },
  ]) {
    const saved = await requestView({ ...withSkills, temporarySkill })
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({
      view: { ...withSkills, temporarySkill: null },
    })
  }
})
