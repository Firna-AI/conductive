import { expect, test } from 'vitest'

import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { OrgModel } from './org-model'
import { valueOf } from './store'
import { testServices } from './test-kit'

const orgId = FAKE_IDS.org
const id = FAKE_IDS.workspace

async function setup() {
  const listed = workspaceFixtures('ready', 'ready-to-merge').detail.workspace
  const server = new FakeApiServer({
    workspaceState: 'ready',
    github: 'ready-to-merge',
  })
  server.json('GET', workspacesPath(orgId), { workspaces: [listed] })
  const org = new OrgModel(testServices(server), orgId)
  await org.reload('list')
  return { server, org, listed }
}

test('the list mark takes the state of an open bar at once', async () => {
  const { org, listed } = await setup()
  const before = org.workspaces.get()
  const release = org.liveGitHub.show(id, {
    branch: listed.branch,
    summary: 'merged',
  })
  expect(org.workspace(id)?.github).toBe('merged')
  expect(org.confirmedWorkspace(id)?.github).toBe('merged')
  release()
  expect(org.workspace(id)?.github).toBe('ready-to-merge')
  expect(org.workspaces.get()).toStrictEqual(before)
})

test('the state of the bar stays over an older list read', async () => {
  const { server, org, listed } = await setup()
  const release = org.liveGitHub.show(id, {
    branch: listed.branch,
    summary: 'merged',
  })
  // The Worker copies the state to the list after the event of the bar.
  await org.reload('list')
  expect(org.workspace(id)?.github).toBe('merged')
  server.json('GET', workspacesPath(orgId), {
    workspaces: [{ ...listed, github: 'merged' }],
  })
  await org.reload('list')
  release()
  expect(org.workspace(id)?.github).toBe('merged')
})

test('a state of another branch leaves the list summary', async () => {
  const { org, listed } = await setup()
  const before = org.workspaces.get()
  org.liveGitHub.show(id, { branch: 'calummoore/old-task', summary: null })
  expect(org.workspace(id)?.github).toBe('ready-to-merge')
  expect(org.workspaces.get()).toBe(before)
  expect(valueOf(org.workspaces.get())?.[0]?.branch).toBe(listed.branch)
})

test('an older release keeps a newer state of the same workspace', async () => {
  const { org, listed } = await setup()
  const first = org.liveGitHub.show(id, {
    branch: listed.branch,
    summary: 'checks-running',
  })
  const second = org.liveGitHub.show(id, {
    branch: listed.branch,
    summary: 'checks-failed',
  })
  first()
  expect(org.workspace(id)?.github).toBe('checks-failed')
  second()
  expect(org.workspace(id)?.github).toBe('ready-to-merge')
})
