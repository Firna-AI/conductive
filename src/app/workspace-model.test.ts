import { describe, expect, test } from 'vitest'
import { workspacePaths } from '../shared/workspaces'
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
const openPath = workspacePaths.open(org, id)

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
    held.hold('POST', openPath)
    const opening = workspace.open()
    workspace.close()
    held.release('POST', openPath)
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

  test('archive lists the found work, and a confirm sends the explicit discard', async () => {
    const server = new FakeApiServer()
    const { org: model, workspace } = setup(server)
    await model.reload('list')
    await workspace.open()
    await workspace.archive.start()
    expect(workspace.archive.flow.get()).toMatchObject({
      step: 'confirm',
      check: {
        uncommittedFiles: ['src/app/checkout/AddressForm.tsx'],
        unpushedCommits: 1,
      },
    })
    await workspace.archive.confirm()
    const archive = server.requests.at(-1)
    expect(archive?.method).toBe('POST')
    expect(await archive?.json()).toEqual({ discardUnpushedWork: true })
    expect(model.workspace(id)?.state).toBe('archived')
    expect(workspace.archive.flow.get()).toEqual({ step: 'closed' })
  })

  test('cancel after the archive check changes nothing', async () => {
    const server = new FakeApiServer()
    const { workspace } = setup(server)
    await workspace.open()
    await workspace.archive.start()
    workspace.archive.cancel()
    await workspace.archive.confirm()
    expect(requestLines(server)).toEqual([
      `POST ${openPath}`,
      `GET ${workspacePaths.archiveCheck(org, id)}`,
    ])
  })

  test('a check that answers after cancel opens no archive question', async () => {
    const { held, workspace } = setup(new FakeApiServer())
    const checkPath = workspacePaths.archiveCheck(org, id)
    held.hold('GET', checkPath)
    const checking = workspace.archive.start()
    workspace.archive.cancel()
    held.release('GET', checkPath)
    await checking
    expect(workspace.archive.flow.get()).toEqual({ step: 'closed' })
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
