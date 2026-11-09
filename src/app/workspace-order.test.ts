import { describe, expect, test } from 'vitest'
import type { WorkspaceEvent } from '../shared/events'
import {
  workspacePath,
  workspacePaths,
  type WorkspaceState,
} from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { OrgModel } from './org-model'
import { valueOf } from './store'
import {
  flushMicrotasks,
  HeldRequests,
  RecordingEvents,
  testServices,
} from './test-kit'
import { WorkspaceModel } from './workspace-model'

const orgId = FAKE_IDS.org
const workspaceId = FAKE_IDS.workspace
const resumePath = workspacePaths.resume(orgId, workspaceId)
const readPath = workspacePaths.read(orgId, workspaceId)
const starting = workspaceFixtures('starting').detail
const archived = workspaceFixtures('archived').detail.workspace

const output: WorkspaceEvent = {
  type: 'assistant.delta',
  sessionId: FAKE_IDS.session,
  turnId: 'turn-1',
  messageId: 'answer-1',
  text: 'The answer is ready.',
}

/** An open workspace on the fake API, whose Resume answer waits for the test. */
async function opened(initial: WorkspaceState) {
  const server = new FakeApiServer({ workspaceState: initial })
  const held = new HeldRequests(server)
  const events = new RecordingEvents()
  const org = new OrgModel(
    testServices(server, { fetch: held.fetch, events }),
    orgId,
  )
  const workspace = new WorkspaceModel(org, workspaceId)
  await org.reload('list')
  await workspace.open()
  held.holdAnswer('POST', resumePath)
  const live = (eventNumber: number, event: WorkspaceEvent) =>
    events.send({
      type: 'event',
      envelope: { workspaceId, eventNumber, occurredAt: FAKE_TIME, event },
    })
  const page = (events: readonly WorkspaceEvent[], through: number) => ({
    type: 'history',
    history: {
      events: events.map((event, index) => ({
        workspaceId,
        eventNumber: through - events.length + index + 1,
        occurredAt: FAKE_TIME,
        event,
      })),
      throughEventNumber: through,
    },
  })
  const marks = () =>
    Promise.all(
      server.requests
        .filter(
          (request) =>
            request.method === 'PUT' &&
            new URL(request.url).pathname === readPath,
        )
        .map((request) => request.clone().json()),
    )
  const state = () => valueOf(workspace.detail.get())?.workspace.state
  return { server, held, events, org, workspace, live, page, marks, state }
}

describe('the order of the open workspace', () => {
  test('an older event of the stream after a newer Resume reply changes nothing', async () => {
    const { server, held, org, workspace, live, state } =
      await opened('stopped')
    server.json('POST', resumePath, { ...starting, eventNumber: 3 })
    const resuming = workspace.resume()
    held.release('POST', resumePath)
    await resuming
    // The stream brings an event that the reply already holds.
    live(1, {
      type: 'workspace.updated',
      workspace: { ...starting.workspace, state: 'stopped' },
    })
    expect(state()).toBe('starting')
    expect(org.workspace(workspaceId)?.state).toBe('starting')
    workspace.close()
  })

  test('keeps an Archive that came while Resume waited over the newer reply of the Resume', async () => {
    const { server, held, workspace, state } = await opened('stopped')
    server.json('POST', resumePath, { ...starting, eventNumber: 1 })
    const resuming = workspace.resume()
    await workspace.archive.start()
    await workspace.archive.confirm()
    expect(state()).toBe('archived')
    held.release('POST', resumePath)
    await resuming
    expect(state()).toBe('archived')
    workspace.close()
  })

  test('shows a list Archive without an event and keeps it over a pending Resume', async () => {
    const { server, held, org, workspace } = await opened('error')
    server.json('POST', resumePath, { ...starting, eventNumber: 1 })
    const resuming = workspace.resume()
    await flushMicrotasks()
    org.putWorkspace(archived)
    const expected = {
      state: 'ready',
      value: { workspace: archived, start: null, error: null },
    }
    expect(workspace.detail.get()).toEqual(expected)
    held.release('POST', resumePath)
    await resuming
    expect(workspace.detail.get()).toEqual(expected)
    expect(org.workspace(workspaceId)?.state).toBe('archived')
    workspace.close()
  })

  test('shows a list Archive before an older open answers and never resumes it', async () => {
    const server = new FakeApiServer({ workspaceState: 'stopped' })
    const held = new HeldRequests(server)
    const org = new OrgModel(testServices(server, { fetch: held.fetch }), orgId)
    await org.reload('list')
    const workspace = new WorkspaceModel(org, workspaceId)
    const path = workspacePath(orgId, workspaceId)
    held.holdAnswer('GET', path)
    const opening = workspace.open()
    await flushMicrotasks()
    org.putWorkspace(archived)
    const expected = {
      state: 'ready',
      value: { workspace: archived, start: null, error: null },
    }
    expect(workspace.detail.get()).toEqual(expected)
    held.release('GET', path)
    await opening
    expect(workspace.detail.get()).toEqual(expected)
    expect(org.workspace(workspaceId)?.state).toBe('archived')
    expect(
      server.requests.filter(
        (request) =>
          request.method === 'POST' &&
          new URL(request.url).pathname === resumePath,
      ),
    ).toHaveLength(0)
    workspace.close()
  })

  test('keeps a read mark that came while Resume waited over the reply of the Resume', async () => {
    const { server, held, org, workspace, live, state } = await opened('unread')
    const unread = valueOf(workspace.detail.get())
    if (!unread) throw new Error('The workspace did not open.')
    // The reply holds the state when the Resume began: still unread.
    server.json('POST', resumePath, { ...unread, eventNumber: 0 })
    const resuming = workspace.resume()
    live(1, output)
    await flushMicrotasks()
    expect(state()).toBe('ready')
    const shown: (string | undefined)[] = []
    workspace.detail.subscribe(() => shown.push(state()))
    held.release('POST', resumePath)
    await resuming
    // The reply shows once, as ready, with no unread state in between.
    expect(shown).toEqual(['ready'])
    expect(org.workspace(workspaceId)?.state).toBe('ready')
    workspace.close()
  })

  test('keeps a newer unread read after a reopen until the replay and a mark reach it', async () => {
    const { server, events, workspace, page, marks, state } =
      await opened('unread')
    events.send(page([output], 1))
    await flushMicrotasks()
    expect(state()).toBe('ready')
    workspace.close()
    // New output came while the tab showed another page.
    server.json('GET', workspacePath(orgId, workspaceId), {
      ...workspaceFixtures('unread').detail,
      eventNumber: 2,
    })
    await workspace.open()
    await flushMicrotasks()
    expect(state()).toBe('unread')
    expect(await marks()).toEqual([{ throughEventNumber: 1 }])
    events.send(page([output], 2))
    await flushMicrotasks()
    expect(await marks()).toEqual([
      { throughEventNumber: 1 },
      { throughEventNumber: 2 },
    ])
    expect(state()).toBe('ready')
    workspace.close()
  })
})
