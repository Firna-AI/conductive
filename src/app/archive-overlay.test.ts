import { describe, expect, test } from 'vitest'
import {
  WORKSPACE_RESTORE_MS,
  workspacePath,
  workspacePaths,
} from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import { OrgModel } from './org-model'
import { groupWorkspaces } from './sections'
import { valueOf } from './store'
import {
  flushMicrotasks,
  HeldRequests,
  requestLines,
  testServices,
} from './test-kit'
import { WorkspaceModel } from './workspace-model'

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace
const openPath = workspacePath(org, id)
const archivePath = workspacePaths.archive(org, id)

function setup(server: FakeApiServer) {
  const held = new HeldRequests(server)
  const model = new OrgModel(testServices(server, { fetch: held.fetch }), org)
  return { held, org: model, workspace: new WorkspaceModel(model, id) }
}

/** The lifecycle fields of the row, the confirmed row, and the detail. */
function shown(model: OrgModel, workspace: WorkspaceModel) {
  const detail = valueOf(workspace.detail.get())
  return {
    row: model.workspace(id)?.state,
    confirmed: model.confirmedWorkspace(id)?.state,
    detail: detail?.workspace.state,
    start: detail?.start ?? null,
  }
}

/** The rows of Checkout as the list shows them, each with its depth. */
function checkoutRows(model: OrgModel): string[] {
  const groups = groupWorkspaces(
    valueOf(model.sections.get()) ?? [],
    valueOf(model.workspaces.get()) ?? [],
    FAKE_TIME,
  )
  const checkout = groups.sections.find(
    (group) => group.section.id === 'checkout',
  )
  return checkout?.rows.map((row) => `${row.workspace.id} ${row.depth}`) ?? []
}

describe('An Archive shows as done while its write runs', () => {
  test('the row and the open workspace show it at once, and its reply then shows', async () => {
    const server = new FakeApiServer()
    const { held, org: model, workspace } = setup(server)
    await model.reload('list')
    await workspace.open()
    held.hold('POST', archivePath)
    const archiving = workspace.archive.archive()
    await flushMicrotasks()
    const during = {
      ...shown(model, workspace),
      archivedAt: model.workspace(id)?.archivedAt,
      restoreUntil: model.workspace(id)?.restoreUntil,
    }
    held.release('POST', archivePath)
    const reply = await archiving
    expect({
      during,
      after: shown(model, workspace),
      running: model.workspaceActions.running.get().size,
      replied: reply?.state,
    }).toEqual({
      during: {
        row: 'archived',
        confirmed: 'ready',
        detail: 'archived',
        start: null,
        archivedAt: FAKE_TIME,
        restoreUntil: FAKE_TIME + WORKSPACE_RESTORE_MS,
      },
      after: {
        row: 'archived',
        confirmed: 'archived',
        detail: 'archived',
        start: null,
      },
      running: 0,
      replied: 'archived',
    })
  })

  test('a failed Archive brings back the row and the open workspace as they were, and a later read keeps them', async () => {
    const server = new FakeApiServer()
    const { held, org: model, workspace } = setup(server)
    await model.reload('list')
    await workspace.open()
    const before = {
      row: model.workspace(id),
      detail: workspace.detail.get(),
    }
    const refused = { error: { code: 'internal_error', message: 'Busy.' } }
    server.json('POST', archivePath, refused, 500)
    held.hold('POST', archivePath)
    const archiving = workspace.archive.archive()
    await flushMicrotasks()
    const during = shown(model, workspace)
    held.release('POST', archivePath)
    const failure = await archiving.then(
      () => null,
      (error: unknown) => (error as Error).message,
    )
    const after = { row: model.workspace(id), detail: workspace.detail.get() }
    await model.reload('list')
    await workspace.open()
    expect({
      during: { row: during.row, detail: during.detail },
      failure,
      restored: after,
      read: shown(model, workspace),
    }).toEqual({
      during: { row: 'archived', detail: 'archived' },
      failure: 'Busy.',
      restored: before,
      read: { row: 'ready', confirmed: 'ready', detail: 'ready', start: null },
    })
  })

  test('a first read that answers while the Archive runs shows the Archive and resumes nothing', async () => {
    const server = new FakeApiServer({ workspaceState: 'stopped' })
    const { held, org: model, workspace } = setup(server)
    await model.reload('list')
    held.holdAnswer('GET', openPath)
    const opening = workspace.open()
    held.hold('POST', archivePath)
    const archiving = workspace.archive.archive()
    await flushMicrotasks()
    const loading = workspace.detail.get().state
    held.release('GET', openPath)
    await opening
    const read = shown(model, workspace).detail
    held.release('POST', archivePath)
    await archiving
    expect({
      loading,
      read,
      writes: requestLines(server).filter((line) => line.startsWith('POST')),
    }).toEqual({
      loading: 'loading',
      read: 'archived',
      writes: [`POST ${archivePath}`],
    })
  })

  test('an Archive of a parent shows its sub-workspaces in its place while it runs, after its reply, and after an event of the archived record', async () => {
    // The sub-workspaces are new, so the list has them at the top of
    // Checkout, before the rows of their parents.
    const server = new FakeApiServer({ subWorkspaces: true })
    const { held, org: model } = setup(server)
    await model.reload('list')
    held.hold('POST', archivePath)
    const archiving = model.workspaceActions.archive(id).archive()
    await flushMicrotasks()
    const during = checkoutRows(model)
    held.release('POST', archivePath)
    const reply = await archiving
    const after = checkoutRows(model)
    // Another tab learns of the Archive from an event of the record.
    const other = new OrgModel(testServices(server), org)
    await other.reload('list')
    if (reply) other.putWorkspace(reply)
    const inPlace = [
      'fix-cart-flake 0',
      'webhook-retries 0',
      'apple-pay 0',
      'merchant-validation 1',
      'wallet-button-tests 1',
      'address-search-api 0',
      'places-client 1',
      'rate-limits 2',
      'rate-limit-load-test 2',
      'suggestion-list 0',
    ]
    expect({ during, after, event: checkoutRows(other) }).toEqual({
      during: inPlace,
      after: inPlace,
      event: inPlace,
    })
  })
})
