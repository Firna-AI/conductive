// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { ACCOUNT_PATHS } from '../../shared/account'
import { API_PATHS } from '../../shared/api'
import { operatorProvidersPath } from '../../shared/operator-providers'
import { byRole, queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, mountScreen, settle, typeText } from '../test-mount'
import { startedApp } from '../test-render'
import { fieldNamed, isOff } from '../workspace/kept-test-kit'
import { CreateOrgScreen } from './CreateOrgScreen'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** Create org over `server`, after the person typed the name of the org. */
async function namedForm(server: FakeApiServer) {
  const app = await startedApp(server)
  const view = mountScreen(app, <CreateOrgScreen first={false} />)
  await settle()
  typeText(fieldNamed(view, 'Name'), 'Firna')
  return { view, create: () => !isOff(byRole('button', 'Create org', view)) }
}

describe('the repositories of Create org', () => {
  test('Create org stays off until the person chooses a repository, and sends the chosen one, with no provider account from a person who is not an operator', async () => {
    const server = new FakeApiServer()
    const { view, create } = await namedForm(server)
    const named = create()
    click(byRole('button', 'Add firna/components', view))
    const chosen = create()
    click(byRole('button', 'Remove firna/components', view))
    const removed = create()
    click(byRole('button', 'Add firna/docs', view))
    click(byRole('button', 'Create org', view))
    await settle()
    const sent = server.requests.find(
      (request) =>
        request.method === 'POST' &&
        new URL(request.url).pathname === API_PATHS.orgs,
    )
    const readsAccounts = server.requests.some(
      (request) => new URL(request.url).pathname === operatorProvidersPath(),
    )
    expect({
      named,
      chosen,
      removed,
      field: queryByText('Provider account', view),
      readsAccounts,
      body: sent ? await sent.json() : null,
    }).toEqual({
      named: false,
      chosen: true,
      removed: false,
      field: null,
      readsAccounts: false,
      body: { name: 'Firna', repositoryIds: [8] },
    })
  })

  test('Create org stays off when the GitHub App reaches no repository', async () => {
    const server = new FakeApiServer()
    server.json('GET', ACCOUNT_PATHS.githubRepositories, { repositories: [] })
    const { create } = await namedForm(server)
    expect(create()).toBe(false)
  })
})
