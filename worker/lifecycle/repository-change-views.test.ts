import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type {
  WorkspaceTab,
  WorkspaceView,
} from '../../src/shared/workspace-view'
import { viewToWire } from '../../src/shared/workspace-view-wire'
import {
  savedWorkspaceView,
  saveWorkspaceView,
} from '../app-api/workspace-view'
import { WORKSPACE_ID } from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { repositoryChangeFixture } from './repository-change.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

type Fixture = Awaited<ReturnType<typeof repositoryChangeFixture>>

const first: WorkspaceTab = { kind: 'session', sessionId: 'first-session' }
const second: WorkspaceTab = { kind: 'session', sessionId: 'second-session' }
const file: WorkspaceTab = { kind: 'file', path: 'README.md', mode: 'source' }
const diff: WorkspaceTab = { kind: 'diff', path: 'src/app.ts' }
const preview: WorkspaceTab = { kind: 'preview', port: 3000 }
const kept = { agent: 'claude', name: 'review' } as const
const temporary = { agent: 'codex', name: 'review' } as const

const save = (f: Fixture, userId: string, view: WorkspaceView) =>
  saveWorkspaceView(f.env.DB, {
    workspaceId: WORKSPACE_ID,
    orgId: f.org.id,
    userId,
    view: viewToWire(view),
    now: 1,
  })

const read = (f: Fixture, userId: string) =>
  savedWorkspaceView(f.env.DB, WORKSPACE_ID, userId)

it('closes repository tabs in every saved view and keeps the order of sessions and skills', async () => {
  const f = await repositoryChangeFixture(harness)
  await save(f, f.owner.id, {
    tabs: [first, file, preview, second, diff],
    activeTab: diff,
    temporaryTab: { kind: 'diff', path: 'src/app.ts' },
    skillTabs: [{ ...kept, place: 3 }],
    fileList: 'changes',
    tool: 'preview',
  })
  await save(f, f.member.id, {
    tabs: [file, second],
    activeTab: second,
    temporaryTab: null,
    skillTabs: [{ ...temporary, place: 1 }],
    temporarySkill: temporary,
    fileList: 'checks',
    tool: 'desktop',
  })
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  await f.finish()
  expect(await f.result(pending.changeId)).toMatchObject({ state: 'changed' })
  expect(await read(f, f.owner.id)).toEqual({
    tabs: [first, second],
    activeTab: null,
    temporaryTab: null,
    skillTabs: [{ ...kept, place: 1 }],
    activeSkill: null,
    temporarySkill: null,
    fileList: 'changes',
    tool: 'preview',
  })
  expect(await read(f, f.member.id)).toEqual({
    tabs: [second],
    activeTab: second,
    temporaryTab: null,
    skillTabs: [{ ...temporary, place: 0 }],
    activeSkill: null,
    temporarySkill: temporary,
    fileList: 'checks',
    tool: 'desktop',
  })
})

it('keeps a tab of the new repository when a publication that lost its reply runs again', async () => {
  const f = await repositoryChangeFixture(harness)
  await save(f, f.owner.id, {
    tabs: [first, file],
    activeTab: file,
    temporaryTab: { kind: 'file', path: 'README.md' },
    fileList: 'all',
    tool: 'terminal',
  })
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  await f.advanceTo('publish')
  await f.failNextCommit('after', 'The committed change reply was lost.')
  await f.coordinator.advance()
  expect(await f.active()).toMatchObject({ phase: 'publish' })
  expect((await read(f, f.owner.id)).tabs).toEqual([first])
  const newer: WorkspaceView = {
    tabs: [first, diff],
    activeTab: diff,
    temporaryTab: null,
    fileList: 'changes',
    tool: 'terminal',
  }
  await save(f, f.owner.id, newer)
  f.reconstruct()
  await f.finish()
  expect(await f.result(pending.changeId)).toMatchObject({ state: 'changed' })
  expect(await read(f, f.owner.id)).toEqual(newer)
})

it('keeps a saved view that is not valid JSON, and still changes the repository', async () => {
  const f = await repositoryChangeFixture(harness)
  await f.env.DB.prepare(
    `INSERT INTO workspace_views (workspace_id, org_id, user_id, view_json, updated_at)
     VALUES (?, ?, ?, 'not json', 0)`,
  )
    .bind(WORKSPACE_ID, f.org.id, f.owner.id)
    .run()
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected a change.')
  await f.finish()
  expect(await f.result(pending.changeId)).toMatchObject({ state: 'changed' })
  const row = await f.env.DB.prepare(
    'SELECT view_json AS viewJson FROM workspace_views WHERE workspace_id = ? AND user_id = ?',
  )
    .bind(WORKSPACE_ID, f.owner.id)
    .first<{ viewJson: string }>()
  expect(row?.viewJson).toBe('not json')
})
