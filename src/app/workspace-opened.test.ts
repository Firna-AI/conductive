import { expect, test } from 'vitest'
import { workspacePaths } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
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

test('the open of a stopped workspace ends after its Resume, so the screen shows no Resume bar during the open', async () => {
  const server = new FakeApiServer({ workspaceState: 'stopped' })
  const held = new HeldRequests(server)
  const org = new OrgModel(
    testServices(server, { fetch: held.fetch, events: new RecordingEvents() }),
    orgId,
  )
  const workspace = new WorkspaceModel(org, workspaceId)
  server.json('POST', resumePath, {
    ...workspaceFixtures('starting').detail,
    eventNumber: 0,
  })
  held.holdAnswer('POST', resumePath)
  const state = () => valueOf(workspace.detail.get())?.workspace.state
  expect(workspace.opened.get()).toBe(false)
  const opening = workspace.open()
  await flushMicrotasks()
  // The read shows the stopped sandbox while the Resume of the open waits.
  expect({ state: state(), opened: workspace.opened.get() }).toEqual({
    state: 'stopped',
    opened: false,
  })
  held.release('POST', resumePath)
  await opening
  expect({ state: state(), opened: workspace.opened.get() }).toEqual({
    state: 'starting',
    opened: true,
  })
  workspace.close()
  expect(workspace.opened.get()).toBe(false)
})
