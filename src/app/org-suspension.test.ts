import { describe, expect, test } from 'vitest'
import { orgPath } from '../shared/api'
import { deleteOrgPath, leaveOrgPath, restoreOrgPath } from '../shared/orgs'
import { workspacePaths } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  fakeUsers,
} from '../test-support/fixtures/core'
import { orgSuspendedBody } from '../test-support/suspended-org'
import { AppModel } from './app-model'
import { OrgModel } from './org-model'
import { asApiError, Store, valueOf } from './store'
import {
  flushMicrotasks,
  ManualInput,
  RecordingEvents,
  requestLines,
  testServices,
} from './test-kit'
import { WorkspaceModel } from './workspace-model'

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace

/** The requests that change something, as `METHOD path` lines. */
function writes(server: FakeApiServer): string[] {
  return requestLines(server).filter((line) => !line.startsWith('GET '))
}

/** Opens the workspace of Acme while the org list shows Acme suspended. */
async function openSuspended(server: FakeApiServer, input = new ManualInput()) {
  const events = new RecordingEvents()
  const model = new OrgModel(
    testServices(server, { events, onInput: input.onInput }),
    org,
    { suspended: new Store(true), note: () => undefined },
  )
  const workspace = new WorkspaceModel(model, id)
  await workspace.open()
  return events
}

describe('the workspace of a suspended org', () => {
  test('sends no Resume, read mark, or activity while the user reads it', async () => {
    const stopped = new FakeApiServer({ workspaceState: 'stopped' })
    await openSuspended(stopped)
    const unread = new FakeApiServer({ workspaceState: 'unread' })
    const input = new ManualInput()
    const events = await openSuspended(unread, input)
    events.send({
      type: 'history',
      history: { events: [], throughEventNumber: 20 },
    })
    input.input()
    await flushMicrotasks()
    expect({ stopped: writes(stopped), unread: writes(unread) }).toEqual({
      stopped: [],
      unread: [],
    })
  })

  test('an org refusal of Resume marks the org suspended on a page with an old org list, keeps the summary, and a new owner keeps the refusal', async () => {
    const server = new FakeApiServer({ workspaceState: 'stopped' })
    server.json('POST', workspacePaths.resume(org, id), orgSuspendedBody, 403)
    const app = new AppModel(testServices(server))
    await app.start()
    const model = app.org(org)
    const before = model.suspension.suspended.get()
    const workspace = new WorkspaceModel(model, id)
    await workspace.open()
    const record = valueOf(workspace.detail.get())?.workspace
    const newOwner = fakeUsers[1]
    if (!record || !newOwner) throw new Error('The workspace did not open.')
    workspace.reassigned({ ...record, owner: newOwner })
    expect({
      before,
      suspended: model.suspension.suspended.get(),
      summary: app.orgs.get().find((item) => item.id === org)?.suspension,
      refusal: workspace.startError.get()?.code,
      owner: valueOf(workspace.detail.get())?.workspace.owner.id,
    }).toEqual({
      before: false,
      suspended: true,
      summary: undefined,
      refusal: 'org_suspended',
      owner: newOwner.id,
    })
  })
})

describe('the org writes of the app model', () => {
  test('a rename, a delete, a restore, or a leave that the API refuses as suspended marks the org on a page with an old org list, and keeps the org list', async () => {
    const refusals = [
      [
        'rename',
        'PATCH',
        orgPath(org),
        (app: AppModel) => app.renameOrg(org, { name: 'Acme Labs' }),
      ],
      [
        'delete',
        'POST',
        deleteOrgPath(org),
        (app: AppModel) => app.deleteOrg(org, 'Acme'),
      ],
      [
        'restore',
        'POST',
        restoreOrgPath(org),
        (app: AppModel) => app.restoreOrg(org),
      ],
      [
        'leave',
        'POST',
        leaveOrgPath(org),
        (app: AppModel) => app.leaveOrg(org),
      ],
    ] as const
    const seen: Record<string, unknown> = {}
    for (const [name, method, path, write] of refusals) {
      const server = new FakeApiServer()
      server.json(method, path, orgSuspendedBody, 403)
      const app = new AppModel(testServices(server))
      await app.start()
      const before = app.org(org).suspension.suspended.get()
      const refusal = await write(app).then(
        () => null,
        (error: unknown) => asApiError(error).code,
      )
      seen[name] = {
        before,
        refusal,
        suspended: app.org(org).suspension.suspended.get(),
        orgs: app.orgs.get(),
      }
    }
    const marked = {
      before: false,
      refusal: 'org_suspended',
      suspended: true,
      orgs: coreFixtures('admin').orgs.orgs,
    }
    expect(seen).toEqual({
      rename: marked,
      delete: marked,
      restore: marked,
      leave: marked,
    })
  })
})
