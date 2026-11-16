import { expect, test } from 'vitest'
import {
  workspacePath,
  workspacePaths,
  workspacesPath,
} from '../../shared/workspaces'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../../test-support/fixtures/core'
import { createApiClient } from '../api/client'
import { readWorkspaceResponse, readWorkspaces } from '../api/read-workspaces'
import { groupWorkspaces } from '../sections'
import { createBackend, guardScope } from './backend'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { seedState } from './seed'
import { workspaceRoutes } from './workspace-routes'

const org = FAKE_IDS.org
const { sections } = coreFixtures().sectionList

/**
 * The dev fake of `?subWorkspaces=1`, with the two trees in Checkout, and
 * its clock, which the test moves on.
 */
function setup() {
  const clock = { now: FAKE_TIME }
  const backend = createBackend(
    seedState(readDevOptions('?subWorkspaces=1')),
    new FakeWorkspaceEvents([]),
    () => clock.now,
    () => 'unused',
  )
  const server = new FakeApiServer({ subWorkspaces: true })
  const api = createApiClient(
    routeFetch(
      workspaceRoutes(backend),
      (requestPath) => guardScope(backend.state, requestPath),
      server.fetch,
    ),
  )
  return { api, clock }
}

test('development moves take the tree of a top-level row, a move of a nested row changes nothing, and an Archive gives its place to the rows under it', async () => {
  const { api, clock } = setup()
  const list = () => api.get(workspacesPath(org), readWorkspaces)
  /** The rows of General, each with its depth. */
  const general = async () =>
    groupWorkspaces(sections, await list())
      .sections.find((group) => group.section.id === 'general')
      ?.rows.map((row) => `${row.workspace.id} ${row.depth}`)
  const send = (method: 'POST' | 'PATCH', path: string, body = {}) =>
    api.send(method, path, body, readWorkspaceResponse)
  await send('POST', workspacePaths.archive(org, 'places-client'))
  await send('PATCH', workspacePath(org, 'checkout-autocomplete'), {
    sectionId: 'general',
    position: 1,
  })
  const moved = await general()
  const archivedSection = (await list()).find(
    (workspace) => workspace.id === 'places-client',
  )?.sectionId
  const before = await list()
  // A minute later, so a change of the nested row would show in its time.
  clock.now += 60_000
  await send('PATCH', workspacePath(org, 'address-search-api'), {
    sectionId: 'infra',
    position: 0,
  })
  const afterNested = await list()
  await send('POST', workspacePaths.archive(org, 'checkout-autocomplete'))

  expect({
    moved,
    archivedSection,
    afterNested,
    archived: await general(),
  }).toEqual({
    moved: [
      'email-dark-mode 0',
      'checkout-autocomplete 0',
      'address-search-api 1',
      'rate-limits 2',
      'rate-limit-load-test 2',
      'suggestion-list 1',
      'invoice-fonts 0',
      'pricing-copy 0',
    ],
    archivedSection: 'general',
    afterNested: before,
    archived: [
      'email-dark-mode 0',
      'address-search-api 0',
      'rate-limits 1',
      'rate-limit-load-test 1',
      'suggestion-list 0',
      'invoice-fonts 0',
      'pricing-copy 0',
    ],
  })
})
