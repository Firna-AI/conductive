import { expect, test } from 'vitest'

import type { WorkspaceEvent } from '../shared/events'
import { workspacesPath, workspacePaths } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { OrgModel } from './org-model'
import { valueOf } from './store'
import {
  flushMicrotasks,
  HeldRequests,
  ManualVisibility,
  RecordingEvents,
  testServices,
} from './test-kit'
import { WorkspaceModel } from './workspace-model'

test('keeps the list GitHub summary through title events, older records, and read marks', async () => {
  const initial = workspaceFixtures('unread', 'checks-running')
  const server = new FakeApiServer({
    workspaceState: 'unread',
    github: 'checks-running',
    legacyWorkspaceRead: true,
  })
  const orgId = FAKE_IDS.org
  const id = FAKE_IDS.workspace
  server.json('GET', workspacesPath(orgId), {
    workspaces: [initial.detail.workspace],
  })
  const events = new RecordingEvents()
  const visible = new ManualVisibility()
  visible.set(false)
  const org = new OrgModel(testServices(server, { events, visible }), orgId)
  const workspace = new WorkspaceModel(org, id)
  const live = (eventNumber: number, event: WorkspaceEvent) =>
    events.send({
      type: 'event',
      envelope: { workspaceId: id, eventNumber, occurredAt: FAKE_TIME, event },
    })
  try {
    await org.reload('list')
    await workspace.open()
    expect(valueOf(workspace.detail.get())?.workspace.github).toBe(
      'checks-running',
    )
    server.json('GET', workspacesPath(orgId), {
      workspaces: [{ ...initial.detail.workspace, github: 'ready-to-merge' }],
    })
    await org.reload('list')
    expect(org.workspace(id)?.github).toBe('ready-to-merge')
    expect(valueOf(workspace.detail.get())?.workspace.github).toBe(
      'checks-running',
    )
    events.send({
      type: 'history',
      history: { events: [], throughEventNumber: 0 },
    })
    live(1, { type: 'workspace.title', name: 'Current title' })
    await flushMicrotasks()
    expect(org.workspace(id)).toMatchObject({
      name: 'Current title',
      github: 'ready-to-merge',
    })
    expect(valueOf(workspace.detail.get())?.workspace.name).toBe(
      'Current title',
    )
    live(2, {
      type: 'workspace.updated',
      workspace: { ...initial.detail.workspace, name: 'Full record title' },
    })
    await flushMicrotasks()
    expect(org.workspace(id)).toMatchObject({
      name: 'Full record title',
      state: 'unread',
      github: 'ready-to-merge',
    })
    visible.set(true)
    await flushMicrotasks()
    const marks = server.requests.filter(
      (request) =>
        request.method === 'PUT' &&
        new URL(request.url).pathname === workspacePaths.read(orgId, id),
    )
    expect(
      await Promise.all(marks.map((request) => request.clone().json())),
    ).toEqual([{ throughEventNumber: 2 }])
    expect(org.workspace(id)).toMatchObject({
      state: 'ready',
      github: 'ready-to-merge',
    })
    expect(valueOf(workspace.detail.get())?.workspace.state).toBe('ready')
    server.json('GET', workspacesPath(orgId), {
      workspaces: [
        {
          ...initial.detail.workspace,
          name: 'Full record title',
          state: 'ready',
          github: 'checks-failed',
        },
      ],
    })
    await org.reload('list')
    expect(org.workspace(id)).toMatchObject({
      name: 'Full record title',
      state: 'ready',
      github: 'checks-failed',
    })
    live(3, {
      type: 'workspace.updated',
      workspace: {
        ...initial.detail.workspace,
        branch: 'calummoore/next-task',
        github: null,
      },
    })
    await flushMicrotasks()
    expect(org.workspace(id)).toMatchObject({
      branch: 'calummoore/next-task',
      github: null,
    })
    org.putWorkspace({ ...initial.created.workspace, github: 'merged' })
    expect(org.workspace(initial.created.workspace.id)?.github).toBe('merged')
    expect(valueOf(org.workspaces.get())?.[0]?.id).toBe(
      initial.created.workspace.id,
    )
  } finally {
    workspace.close()
  }
})

test('an old read-mark reply keeps the polled Continue branch and null summary before its event', async () => {
  const initial = {
    ...workspaceFixtures('unread', 'merged').detail.workspace,
    owner: {
      id: 'cal',
      githubLogin: 'calummoore',
      displayName: 'Cal',
      avatarUrl: null,
    },
  }
  const server = new FakeApiServer({
    workspaceState: 'unread',
    github: 'merged',
    legacyWorkspaceRead: true,
  })
  const orgId = FAKE_IDS.org
  const id = FAKE_IDS.workspace
  const listPath = workspacesPath(orgId)
  const readPath = workspacePaths.read(orgId, id)
  server.json('GET', listPath, { workspaces: [initial] })
  const held = new HeldRequests(server)
  const events = new RecordingEvents()
  const org = new OrgModel(
    testServices(server, { fetch: held.fetch, events }),
    orgId,
  )
  const workspace = new WorkspaceModel(org, id)
  try {
    await org.reload('list')
    held.holdAnswer('PUT', readPath)
    await workspace.open()
    events.send({
      type: 'history',
      history: { events: [], throughEventNumber: 1 },
    })
    await flushMicrotasks()
    const marks = server.requests.filter(
      (request) =>
        request.method === 'PUT' && new URL(request.url).pathname === readPath,
    )
    expect(
      await Promise.all(marks.map((request) => request.clone().json())),
    ).toEqual([{ throughEventNumber: 1 }])
    expect(valueOf(workspace.detail.get())?.workspace.state).toBe('unread')
    const continued = {
      ...initial,
      branch: 'calummoore/next-task',
      github: null,
      state: 'ready',
      updatedAt: FAKE_TIME + 1_000,
    } as const
    server.json('GET', listPath, { workspaces: [continued] })
    await org.reload('list')
    expect(org.workspace(id)).toEqual(continued)
    held.release('PUT', readPath)
    await flushMicrotasks()
    expect(valueOf(workspace.detail.get())?.workspace.state).toBe('ready')
    expect(org.workspace(id)).toEqual(continued)
    events.send({
      type: 'event',
      envelope: {
        workspaceId: id,
        eventNumber: 2,
        occurredAt: FAKE_TIME,
        event: { type: 'workspace.updated', workspace: continued },
      },
    })
    await flushMicrotasks()
    expect(valueOf(workspace.detail.get())?.workspace.branch).toBe(
      'calummoore/next-task',
    )
    expect(org.workspace(id)).toEqual(continued)
  } finally {
    held.release('PUT', readPath)
    workspace.close()
  }
})
