import { describe, expect, test } from 'vitest'
import { pickWorkspaceFiles } from './draft-files.test-support'
import {
  orgSettingsPaths,
  repositoryPositionPath,
  type BuildsResponse,
} from '../shared/org-settings'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../test-support/fixtures/core'
import { repositoryFixtures } from '../test-support/fixtures/repositories'
import { OrgModel } from './org-model'
import { moveRepository } from './settings-actions'
import { testServices } from './test-kit'

const org = FAKE_IDS.org
/** What the form gives the send: its repository and its choice. */
const defaults = {
  repositoryId: 'storefront',
  choice: {
    agent: 'claude',
    model: 'Opus 5.5',
    effort: 'high',
    fast: false,
  } as const,
}

/** The builds of Acme, whose org image lacks the chosen repositories `added`. */
function lacking(added: readonly string[]): BuildsResponse {
  const { builds } = coreFixtures()
  return {
    ...builds,
    changes: {
      ...builds.changes,
      addedRepositories: added.map((id) => ({ id, fullName: `acme/${id}` })),
    },
  }
}

/** The repository of each create request that the server got, in order. */
async function sentRepositories(server: FakeApiServer): Promise<unknown[]> {
  const creates = server.requests.filter(
    (request) =>
      request.method === 'POST' &&
      new URL(request.url).pathname === workspacesPath(org),
  )
  const bodies = await Promise.all(creates.map((request) => request.json()))
  return bodies.map((body) => body.repositoryId)
}

describe('the repository of a New workspace draft', () => {
  test('a draft keeps the repository that the form showed at its first text or file, once the repositories and the builds load, until a send, and a pick stays', async () => {
    const server = new FakeApiServer()
    // acme/storefront comes first, and it waits for a build.
    server.json('GET', orgSettingsPaths.builds(org), lacking(['storefront']))
    const model = new OrgModel(testServices(server), org)
    const draft = model.newWorkspace(null)
    // The first text comes before the repositories and the builds load.
    draft.setText('Fix the flaky cart test.')
    await model.reload('repositories')
    const whileBuildsLoad = draft.draft.get().repository
    await model.reload('builds')
    const loaded = draft.draft.get().repository
    // The build succeeds, so acme/storefront is ready, and it comes first.
    server.json('GET', orgSettingsPaths.builds(org), lacking([]))
    await model.reload('builds')
    await draft.send(defaults)
    // The next draft starts with a file.
    await pickWorkspaceFiles(draft, [new File(['Cart notes'], 'notes.txt')])
    const next = draft.draft.get().repository
    draft.setText('Add gift cards.')
    await draft.send(defaults)
    // A pick wins over the kept repository, and it stays after a send.
    draft.setText('Add a banner.')
    draft.setRepository('marketing-site')
    await draft.send(defaults)
    draft.setText('Add a footer.')
    await draft.send(defaults)
    expect({
      whileBuildsLoad,
      loaded,
      next,
      sent: await sentRepositories(server),
      last: draft.draft.get().repository,
    }).toEqual({
      whileBuildsLoad: null,
      loaded: { id: 'billing-service', picked: false },
      next: { id: 'storefront', picked: false },
      sent: [
        'billing-service',
        'storefront',
        'marketing-site',
        'marketing-site',
      ],
      last: { id: 'marketing-site', picked: true },
    })
  })

  test('with the readiness of the repositories reply, a written draft keeps the repository that the form showed while the builds fail to load, also when another repository turns ready', async () => {
    const server = new FakeApiServer()
    const { repositories } = repositoryFixtures(org).repositories
    const lacking = (ids: readonly string[]) => ({
      repositories: repositories.map((item) => ({
        ...item,
        ready: !ids.includes(item.id),
        imageReady: true,
      })),
    })
    const error = { code: 'server_error', message: 'The request failed.' }
    server.json('GET', orgSettingsPaths.builds(org), { error }, 500)
    // acme/storefront comes first, and the org image lacks it.
    server.json(
      'GET',
      orgSettingsPaths.repositories(org),
      lacking(['storefront']),
    )
    const model = new OrgModel(testServices(server), org)
    await model.reload('builds')
    const draft = model.newWorkspace(null)
    draft.setText('Fix the flaky cart test.')
    await model.reload('repositories')
    const shown = draft.draft.get().repository
    // The build of acme/storefront succeeds, and the repositories read again.
    server.json('GET', orgSettingsPaths.repositories(org), lacking([]))
    await model.reload('repositories')
    await draft.send(defaults)
    expect({ shown, sent: await sentRepositories(server) }).toEqual({
      shown: { id: 'billing-service', picked: false },
      sent: ['billing-service'],
    })
  })

  test('a kept repository that the org no longer chose gives way to the first ready one, which the send then uses', async () => {
    const server = new FakeApiServer()
    const model = new OrgModel(testServices(server), org)
    await Promise.all([model.reload('repositories'), model.reload('builds')])
    const draft = model.newWorkspace(null)
    draft.setText('Fix the flaky cart test.')
    const kept = draft.draft.get().repository
    // An admin takes acme/storefront out of the repositories of the org.
    const { repositories } = repositoryFixtures(org).repositories
    server.json('GET', orgSettingsPaths.repositories(org), {
      repositories: repositories.map((item) =>
        item.id === 'storefront' ? { ...item, selected: false } : item,
      ),
    })
    await model.reload('repositories')
    const removed = draft.draft.get().repository
    await draft.send(defaults)
    expect({ kept, removed, sent: await sentRepositories(server) }).toEqual({
      kept: { id: 'storefront', picked: false },
      removed: { id: 'billing-service', picked: false },
      sent: ['billing-service'],
    })
  })

  test('after a move of the repository order, a new draft starts in the new first repository, and a kept draft keeps its own', async () => {
    const server = new FakeApiServer()
    const model = new OrgModel(testServices(server), org)
    await Promise.all([model.reload('repositories'), model.reload('builds')])
    const kept = model.newWorkspace(null)
    kept.setText('Fix the flaky cart test.')
    server.json('PUT', repositoryPositionPath(org, 'marketing-site'), {
      order: ['marketing-site', 'storefront', 'billing-service'],
    })
    await moveRepository(model, 'marketing-site', 0)
    const fresh = model.newWorkspace('checkout')
    fresh.setText('Add a banner.')
    expect({
      kept: kept.draft.get().repository,
      fresh: fresh.draft.get().repository,
    }).toEqual({
      kept: { id: 'storefront', picked: false },
      fresh: { id: 'marketing-site', picked: false },
    })
  })
})
