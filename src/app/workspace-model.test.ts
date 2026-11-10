import { describe, expect, test } from 'vitest'
import { workspacePath, workspacePaths } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
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

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace
const openPath = workspacePath(org, id)

function setup(server: FakeApiServer, visible = new ManualVisibility()) {
  const held = new HeldRequests(server)
  const events = new RecordingEvents()
  const model = new OrgModel(
    testServices(server, { fetch: held.fetch, events, visible }),
    org,
  )
  return { held, events, org: model, workspace: new WorkspaceModel(model, id) }
}

/** The bodies of the read marks that the server got, in their order. */
function readMarks(server: FakeApiServer): Promise<unknown[]> {
  const path = workspacePaths.read(org, id)
  return Promise.all(
    server.requests
      .filter(
        (request) =>
          request.method === 'PUT' && new URL(request.url).pathname === path,
      )
      .map((request) => request.clone().json()),
  )
}

describe('WorkspaceModel', () => {
  test('an open that answers after close starts no event stream', async () => {
    const { held, events, workspace } = setup(new FakeApiServer())
    held.hold('GET', openPath)
    const opening = workspace.open()
    workspace.close()
    held.release('GET', openPath)
    await opening
    expect(events.opened).toEqual([])
    expect(workspace.detail.get()).toEqual({ state: 'loading' })
  })

  test('a start event shows the new steps while the sandbox starts', async () => {
    const { events, workspace } = setup(
      new FakeApiServer({ workspaceState: 'starting' }),
    )
    await workspace.open()
    events.send({
      type: 'history',
      history: { events: [], throughEventNumber: 4 },
    })
    events.send({
      type: 'event',
      envelope: {
        workspaceId: id,
        eventNumber: 5,
        occurredAt: FAKE_TIME,
        event: {
          type: 'start.updated',
          start: {
            kind: 'resume',
            startedAt: FAKE_TIME - 3_000,
            steps: [
              {
                id: 'restore',
                label: 'Resuming with your files as you left them',
                state: 'completed',
                startedAt: FAKE_TIME - 3_000,
                completedAt: FAKE_TIME - 1_000,
              },
              {
                id: 'runner',
                label: 'Starting the agents',
                state: 'running',
                startedAt: FAKE_TIME - 1_000,
                completedAt: null,
              },
            ],
          },
        },
      },
    })
    const detail = workspace.detail.get()
    expect(
      detail.state === 'ready' &&
        detail.value.start?.steps.map((step) => [step.label, step.state]),
    ).toEqual([
      ['Resuming with your files as you left them', 'completed'],
      ['Starting the agents', 'running'],
    ])
  })

  test('Archive sends one request with no check, and the workspace and its row keep the cloud computer until the last day of Restore', async () => {
    const server = new FakeApiServer()
    const { org: model, workspace } = setup(server)
    await model.reload('list')
    await workspace.open()
    const from = server.requests.length
    const archived = await workspace.archive.archive()
    const write = server.requests.at(-1)
    expect({
      requests: requestLines(server).slice(from),
      body: await write?.json(),
      reply: archived?.state,
      detail: valueOf(workspace.detail.get())?.workspace.state,
      row: model.workspace(id)?.state,
      restoreUntil: model.workspace(id)?.restoreUntil,
    }).toEqual({
      requests: [`POST ${workspacePaths.archive(org, id)}`],
      body: {},
      reply: 'archived',
      detail: 'archived',
      row: 'archived',
      restoreUntil: FAKE_TIME + 14 * 24 * 60 * 60 * 1_000,
    })
  })

  test('Restore sends one request, puts the workspace back in its section stopped, and starts nothing', async () => {
    const server = new FakeApiServer()
    const { org: model, workspace } = setup(server)
    await model.reload('list')
    const section = model.workspace(id)?.sectionId
    await workspace.open()
    await workspace.archive.archive()
    const from = server.requests.length
    const restored = await workspace.archive.restore()
    expect({
      requests: requestLines(server).slice(from),
      reply: restored?.state,
      detail: valueOf(workspace.detail.get())?.workspace,
      row: model.workspace(id),
    }).toMatchObject({
      requests: [`POST ${workspacePaths.restore(org, id)}`],
      reply: 'stopped',
      detail: { state: 'stopped', archivedAt: null, restoreUntil: null },
      row: {
        state: 'stopped',
        archivedAt: null,
        restoreUntil: null,
        sectionId: section,
      },
    })
  })

  test('a newer update while the read mark runs stays in place', async () => {
    const server = new FakeApiServer({ workspaceState: 'unread' })
    const { held, events, workspace } = setup(server)
    const readPath = workspacePaths.read(org, id)
    held.hold('PUT', readPath)
    await workspace.open()
    events.send({
      type: 'history',
      history: { events: [], throughEventNumber: 4 },
    })
    const detail = workspace.detail.get()
    if (detail.state !== 'ready') throw new Error('The workspace did not open.')
    events.send({
      type: 'event',
      envelope: {
        workspaceId: id,
        eventNumber: 5,
        occurredAt: FAKE_TIME,
        event: {
          type: 'workspace.updated',
          workspace: { ...detail.value.workspace, state: 'working' },
        },
      },
    })
    held.release('PUT', readPath)
    await flushMicrotasks()
    expect(requestLines(server)).toContain(`PUT ${readPath}`)
    expect(workspace.detail.get()).toMatchObject({
      state: 'ready',
      value: { workspace: { state: 'working' } },
    })
  })

  test('an update to unread that comes with the newest event is marked read', async () => {
    const server = new FakeApiServer()
    const { events, workspace } = setup(server)
    const readPath = workspacePaths.read(org, id)
    await workspace.open()
    events.send({
      type: 'history',
      history: { events: [], throughEventNumber: 20 },
    })
    const detail = workspace.detail.get()
    if (detail.state !== 'ready') throw new Error('The workspace did not open.')
    events.send({
      type: 'event',
      envelope: {
        workspaceId: id,
        eventNumber: 21,
        occurredAt: FAKE_TIME,
        event: {
          type: 'workspace.updated',
          workspace: { ...detail.value.workspace, state: 'unread' },
        },
      },
    })
    await flushMicrotasks()
    const reads = server.requests.filter(
      (request) =>
        request.method === 'PUT' && new URL(request.url).pathname === readPath,
    )
    expect(await Promise.all(reads.map((read) => read.json()))).toEqual([
      { throughEventNumber: 21 },
    ])
    expect(workspace.detail.get()).toMatchObject({
      state: 'ready',
      value: { workspace: { state: 'ready' } },
    })
  })

  test('a hidden page sends no read mark, and the page that shows again marks the newest event read', async () => {
    const server = new FakeApiServer({ workspaceState: 'unread' })
    const visible = new ManualVisibility()
    const { events, workspace } = setup(server, visible)
    const seen = async () => ({
      reads: await readMarks(server),
      state: valueOf(workspace.detail.get())?.workspace.state,
    })
    // An unread workspace opens in a hidden page, such as a background tab.
    visible.set(false)
    await workspace.open()
    events.send({
      type: 'history',
      history: { events: [], throughEventNumber: 20 },
    })
    await flushMicrotasks()
    expect(await seen()).toEqual({ reads: [], state: 'unread' })
    visible.set(true)
    await flushMicrotasks()
    expect(await seen()).toEqual({
      reads: [{ throughEventNumber: 20 }],
      state: 'ready',
    })
    // The page hides again, and the next turn ends with new output.
    const record = valueOf(workspace.detail.get())?.workspace
    if (!record) throw new Error('The workspace did not open.')
    visible.set(false)
    const envelope = { workspaceId: id, occurredAt: FAKE_TIME }
    events.send({
      type: 'event',
      envelope: {
        ...envelope,
        eventNumber: 21,
        event: {
          type: 'workspace.updated',
          workspace: { ...record, state: 'unread' },
        },
      },
    })
    events.send({
      type: 'event',
      envelope: {
        ...envelope,
        eventNumber: 22,
        event: { type: 'workspace.title', name: 'Address autocomplete' },
      },
    })
    await flushMicrotasks()
    expect(await seen()).toEqual({
      reads: [{ throughEventNumber: 20 }],
      state: 'unread',
    })
    visible.set(true)
    await flushMicrotasks()
    expect(await seen()).toEqual({
      reads: [{ throughEventNumber: 20 }, { throughEventNumber: 22 }],
      state: 'ready',
    })
    workspace.close()
    expect(visible.listening).toBe(0)
  })
})
