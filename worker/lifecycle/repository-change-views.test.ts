import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type {
  WorkspaceTab,
  WorkspaceView,
} from '../../src/shared/workspace-view'
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

const save = (f: Fixture, userId: string, view: WorkspaceView) =>
  saveWorkspaceView(f.env.DB, {
    workspaceId: WORKSPACE_ID,
    orgId: f.org.id,
    userId,
    view,
    now: 1,
  })

const read = (f: Fixture, userId: string) =>
  savedWorkspaceView(f.env.DB, WORKSPACE_ID, userId)

it('closes the file and diff tabs of the saved view of every member, and keeps the session tabs', async () => {
  const f = await repositoryChangeFixture(harness)
  await save(f, f.owner.id, {
    tabs: [first, file, second, diff],
    activeTab: diff,
    temporaryTab: { kind: 'diff', path: 'src/app.ts' },
    fileList: 'changes',
    tool: 'preview',
  })
  await save(f, f.member.id, {
    tabs: [file, second],
    activeTab: second,
    temporaryTab: null,
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
    fileList: 'changes',
    tool: 'preview',
  })
  expect(await read(f, f.member.id)).toEqual({
    tabs: [second],
    activeTab: second,
    temporaryTab: null,
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
