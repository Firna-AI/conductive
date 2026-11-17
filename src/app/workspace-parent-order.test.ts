import { expect, test } from 'vitest'

import { sectionsPath } from '../shared/sections'
import { placeWorkspaces } from '../shared/workspace-tree'
import { workspacePath, workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../test-support/fixtures/core'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { OrgModel } from './org-model'
import { valueOf } from './store'
import {
  flushMicrotasks,
  HeldRequests,
  ManualVisibility,
  RecordingEvents,
  requestLines,
  testServices,
} from './test-kit'
import { WorkspaceModel } from './workspace-model'

const orgId = FAKE_IDS.org
const listPath = workspacesPath(orgId)
const before = [
  ['parent', 'general', null],
  [FAKE_IDS.workspace, 'general', 'parent'],
  ['sibling', 'review', null],
]
const after = [
  ['parent', 'general', null],
  [FAKE_IDS.workspace, 'review', null],
  ['sibling', 'review', null],
]

async function opened() {
  const detail = workspaceFixtures('ready').detail
  const moving = {
    ...detail.workspace,
    sectionId: 'general',
    parentId: 'parent',
  }
  const parent = { ...moving, id: 'parent', number: 1, parentId: null }
  const sibling = {
    ...moving,
    id: 'sibling',
    number: 3,
    parentId: null,
    sectionId: 'review',
  }
  const server = new FakeApiServer({ workspaceState: 'ready' })
  const general = coreFixtures().sectionList.sections.find(
    (section) => section.id === 'general',
  )
  if (!general) throw new Error('The General section is missing.')
  server.json('GET', sectionsPath(orgId), {
    sections: [
      general,
      { ...general, id: 'review', name: 'Review', position: 1 },
    ],
  })
  server.json('GET', listPath, { workspaces: [parent, moving, sibling] })
  server.json('GET', workspacePath(orgId, moving.id), {
    ...detail,
    workspace: moving,
  })
  const held = new HeldRequests(server)
  const events = new RecordingEvents()
  const visible = new ManualVisibility()
  visible.set(false)
  const org = new OrgModel(
    testServices(server, { fetch: held.fetch, events, visible }),
    orgId,
  )
  const workspace = new WorkspaceModel(org, moving.id)
  await org.reload('list')
  await workspace.open()
  events.send({
    type: 'history',
    history: { events: [], throughEventNumber: 0 },
  })
  const places = () => {
    const list = valueOf(org.resources.list.store.get())
    if (!list) throw new Error('The list is missing.')
    return placeWorkspaces(list.workspaces, list.sections).map(
      ({ workspace, sectionId, parentId }) => [
        workspace.id,
        sectionId,
        parentId,
      ],
    )
  }
  const detach = () => {
    const detached = {
      ...moving,
      name: 'Detached workspace',
      parentId: null,
      sectionId: 'review',
      updatedAt: FAKE_TIME + 1,
    }
    server.json('GET', listPath, {
      workspaces: [parent, detached, sibling],
    })
    events.send({
      type: 'event',
      envelope: {
        workspaceId: moving.id,
        eventNumber: 1,
        occurredAt: FAKE_TIME + 1,
        event: { type: 'workspace.updated', workspace: detached },
      },
    })
  }
  const reads = () =>
    requestLines(server).filter((line) => line === `GET ${listPath}`).length
  const close = () => {
    held.release('GET', listPath)
    held.release('GET', listPath)
    workspace.close()
  }
  return { held, org, workspace, places, detach, reads, close }
}

test('keeps listed placement until a parent-change event reads the detached workspace in its destination section', async () => {
  const fixture = await opened()
  const { held, org, places, detach, reads, close } = fixture
  try {
    expect(places()).toEqual(before)
    held.holdAnswer('GET', listPath)
    detach()
    await flushMicrotasks()
    expect.soft(places()).toEqual(before)
    expect(org.workspace(FAKE_IDS.workspace)?.name).toBe('Detached workspace')
    expect(reads()).toBe(2)
    const reading = org.reload('list')
    held.release('GET', listPath)
    await reading
    expect(places()).toEqual(after)
  } finally {
    close()
  }
})

test('starts a fresh placement read after an overlapping list read finishes', async () => {
  const fixture = await opened()
  const { held, org, places, detach, reads, close } = fixture
  try {
    held.holdAnswer('GET', listPath)
    const reading = org.reload('list')
    await flushMicrotasks()
    held.holdAnswer('GET', listPath)
    detach()
    await flushMicrotasks()
    expect.soft(places()).toEqual(before)
    expect(reads()).toBe(2)
    held.release('GET', listPath)
    await reading
    await flushMicrotasks()
    expect.soft(places()).toEqual(before)
    expect(reads()).toBe(3)
    const fresh = org.reload('list')
    held.release('GET', listPath)
    await fresh
    expect(places()).toEqual(after)
  } finally {
    close()
  }
})
