import { describe, expect, test } from 'vitest'
import {
  workspacePath,
  workspacePaths,
  type WorkspaceState,
} from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import {
  importedFixtures,
  type FakeImport,
} from '../test-support/fake-import-routes'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import { OrgModel } from './org-model'
import { valueOf } from './store'
import { HeldRequests, RecordingEvents, testServices } from './test-kit'
import { WorkspaceModel } from './workspace-model'

const orgId = FAKE_IDS.org
const workspaceId = FAKE_IDS.workspace
const activatePath = workspacePaths.activate(orgId, workspaceId)
const resumePath = workspacePaths.resume(orgId, workspaceId)

/** The starts that the model sent: each POST to Activate or Resume. */
function starts(server: FakeApiServer): string[] {
  return server.requests
    .filter((request) => request.method === 'POST')
    .map((request) => new URL(request.url).pathname)
    .filter((path) => path === activatePath || path === resumePath)
}

async function openImported(imported: FakeImport) {
  const server = new FakeApiServer({ imported })
  const held = new HeldRequests(server)
  const events = new RecordingEvents()
  const org = new OrgModel(
    testServices(server, { fetch: held.fetch, events }),
    orgId,
  )
  const workspace = new WorkspaceModel(org, workspaceId)
  await org.reload('list')
  await workspace.open()
  return { server, held, events, workspace }
}

const shownState = (workspace: WorkspaceModel) =>
  valueOf(workspace.detail.get())?.workspace.state

describe('an import that waits for its activation', () => {
  test.each(['inactive', 'failed', 'stopped'] as const)(
    'its open in the %s state sends no Activate and no Resume',
    async (imported) => {
      const { server, workspace } = await openImported(imported)
      expect(starts(server)).toEqual([])
      workspace.close()
    },
  )

  test('Activate sends an empty body to the activate route and shows the start of the activation', async () => {
    const { server, workspace } = await openImported('inactive')
    await workspace.resume()
    const sent = server.requests.filter(
      (request) => new URL(request.url).pathname === activatePath,
    )
    expect(sent.map((request) => request.method)).toEqual(['POST'])
    expect(await sent[0].json()).toEqual({})
    expect(starts(server)).toEqual([activatePath])
    expect(valueOf(workspace.detail.get())).toMatchObject({
      workspace: { state: 'starting', conductorImport: { activatedAt: null } },
      start: { kind: 'create', steps: [{ id: 'image', state: 'running' }] },
    })
    workspace.close()
  })

  test.each(['failed', 'stopped'] as const)(
    'Try again in the %s state sends Activate, not Resume',
    async (imported) => {
      const { server, workspace } = await openImported(imported)
      await workspace.resume()
      expect(starts(server)).toEqual([activatePath])
      workspace.close()
    },
  )

  test('an event of the stream during the Activate wins over its reply', async () => {
    const { held, events, workspace } = await openImported('inactive')
    held.holdAnswer('POST', activatePath)
    const activating = workspace.resume()
    const { detail } = importedFixtures('failed')
    events.send({
      type: 'event',
      envelope: {
        workspaceId,
        eventNumber: 1,
        occurredAt: FAKE_TIME,
        event: { type: 'workspace.updated', workspace: detail.workspace },
      },
    })
    held.release('POST', activatePath)
    await activating
    expect(shownState(workspace)).toBe('error')
    workspace.close()
  })
})

test('an activated import that stopped resumes at its open, as every workspace does', async () => {
  const server = new FakeApiServer({ imported: 'ready' })
  const { detail } = importedFixtures('ready')
  const stopped: WorkspaceState = 'stopped'
  server.json('GET', workspacePath(orgId, workspaceId), {
    ...detail,
    workspace: { ...detail.workspace, state: stopped },
  })
  const org = new OrgModel(testServices(server), orgId)
  const workspace = new WorkspaceModel(org, workspaceId)
  await org.reload('list')
  await workspace.open()
  expect(starts(server)).toEqual([resumePath])
  workspace.close()
})
