import { expect, test } from 'vitest'

import type { WorkspaceEvent } from '../shared/events'
import type { Workspace } from '../shared/generated/Workspace'
import type { WorkspaceState } from '../shared/generated/WorkspaceState'
import { workspacesPath } from '../shared/workspaces'
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

const orgId = FAKE_IDS.org
const workspaceId = FAKE_IDS.workspace
const listPath = workspacesPath(orgId)

async function opened(state: WorkspaceState = 'ready') {
  const initial = workspaceFixtures(state).detail.workspace
  const server = new FakeApiServer({
    workspaceState: state,
    legacyWorkspaceRead: true,
  })
  server.json('GET', listPath, { workspaces: [initial] })
  const held = new HeldRequests(server)
  const events = new RecordingEvents()
  const visible = new ManualVisibility()
  visible.set(false)
  const org = new OrgModel(
    testServices(server, { fetch: held.fetch, events, visible }),
    orgId,
  )
  const workspace = new WorkspaceModel(org, workspaceId)
  await org.reload('list')
  await workspace.open()
  events.send({
    type: 'history',
    history: { events: [], throughEventNumber: 0 },
  })
  const live = (eventNumber: number, event: WorkspaceEvent) =>
    events.send({
      type: 'event',
      envelope: {
        workspaceId,
        eventNumber,
        occurredAt: FAKE_TIME,
        event,
      },
    })
  const newer: Workspace = {
    ...initial,
    owner: {
      id: 'new-owner',
      githubLogin: 'calummoore',
      displayName: 'Cal',
      avatarUrl: null,
    },
    state: 'working',
    updatedAt: FAKE_TIME + 1_000,
  }
  return { newer, server, held, visible, org, workspace, live }
}

test('a title event keeps the newer owner and activity from a list poll', async () => {
  const { newer, server, org, workspace, live } = await opened()
  try {
    server.json('GET', listPath, { workspaces: [newer] })
    await org.reload('list')
    live(1, { type: 'workspace.title', name: 'A newer title' })
    expect(valueOf(workspace.detail.get())?.workspace.name).toBe(
      'A newer title',
    )
    expect(org.workspace(workspaceId)).toEqual({
      ...newer,
      name: 'A newer title',
    })
  } finally {
    workspace.close()
  }
})

test('a start-step event keeps every list field from a newer poll', async () => {
  const { newer, server, org, workspace, live } = await opened('starting')
  try {
    server.json('GET', listPath, { workspaces: [newer] })
    await org.reload('list')
    const event: WorkspaceEvent = {
      type: 'start.updated',
      start: { kind: 'resume', startedAt: FAKE_TIME, steps: [] },
    }
    live(1, event)
    expect(valueOf(workspace.detail.get())?.start).toEqual(event.start)
    expect(org.workspace(workspaceId)).toEqual(newer)
  } finally {
    workspace.close()
  }
})

test('keeps full-record, name, and read changes over an older list reply', async () => {
  const { newer, held, visible, org, workspace, live } = await opened('unread')
  held.holdAnswer('GET', listPath)
  const reading = org.reload('list')
  try {
    await flushMicrotasks()
    const full: Workspace = {
      ...newer,
      branch: 'calummoore/next-task',
      github: null,
    }
    org.putWorkspace(full)
    live(1, { type: 'workspace.title', name: 'A newer title' })
    visible.set(true)
    await flushMicrotasks()
    expect(valueOf(workspace.detail.get())?.workspace.state).toBe('ready')
    held.release('GET', listPath)
    await reading
    expect(org.workspace(workspaceId)).toEqual({
      ...full,
      name: 'A newer title',
    })
  } finally {
    held.release('GET', listPath)
    await reading
    workspace.close()
  }
})
