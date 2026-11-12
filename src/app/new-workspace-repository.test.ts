import { describe, expect, test } from 'vitest'
import { pickWorkspaceFiles } from './draft-files.test-support'
import { orgSettingsPaths, type BuildsResponse } from '../shared/org-settings'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../test-support/fixtures/core'
import { repositoryFixtures } from '../test-support/fixtures/repositories'
import { OrgModel } from './org-model'
import { testServices } from './test-kit'

const org = FAKE_IDS.org
/** What the form gives the send: its repository and its choice. */
const defaults = {
  repositoryId: 'storefront',
  choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' } as const,
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
})
