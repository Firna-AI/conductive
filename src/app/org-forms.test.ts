import { describe, expect, test } from 'vitest'
import { API_PATHS } from '../shared/api'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_ORIGIN, FAKE_TIME } from '../test-support/fixtures/core'
import { AppModel } from './app-model'
import { createBackend, guardScope } from './dev/backend'
import { readDevOptions } from './dev/options'
import { orgRoutes } from './dev/org-routes'
import { routeFetch } from './dev/router'
import { seedState } from './dev/seed'
import { settingsRoutes } from './dev/settings-routes'
import { valueOf } from './store'
import { testServices } from './test-kit'

/** The app over the stateful org and settings routes of the dev fake. */
async function startedOverDevRoutes() {
  const server = new FakeApiServer()
  const backend = createBackend(
    seedState(readDevOptions('')),
    server.events,
    () => FAKE_TIME,
    () => 'unused',
  )
  const answer = routeFetch(
    [...orgRoutes(backend), ...settingsRoutes(backend)],
    (path) => guardScope(backend.state, path),
    server.fetch,
  )
  const sent: { method: string; path: string; body: unknown }[] = []
  const app = new AppModel(
    testServices(server, {
      fetch: async (input, init) => {
        const request = new Request(new URL(input, FAKE_ORIGIN), init)
        if (request.method !== 'GET') {
          sent.push({
            method: request.method,
            path: new URL(request.url).pathname,
            body: await request.clone().json(),
          })
        }
        return answer(input, init)
      },
    }),
  )
  await app.start()
  return { app, sent }
}

describe('org forms', () => {
  test('Create org sends the initials and the GitHub IDs, and the org keeps its initials through rename, delete, and restore', async () => {
    const { app, sent } = await startedOverDevRoutes()
    const tile = (id: string) => app.orgs.get().find((org) => org.id === id)
    // acme/mobile-app and acme/data-pipeline in the account's repository list.
    const created = await app.createOrg({
      name: 'Acme Labs',
      initials: 'AL',
      repositoryIds: [5, 6],
    })
    const listed = tile(created.id)
    const model = app.org(created.id)
    await model.reload('repositories')
    const chosen = valueOf(model.repositories.get())
      ?.filter((repository) => repository.selected)
      .map((repository) => repository.fullName)
    await app.renameOrg(created.id, { name: 'Acme Lab' })
    const renamed = tile(created.id)
    await app.renameOrg(created.id, { name: 'Acme Lab', initials: 'LB' })
    await app.deleteOrg(created.id, 'Acme Lab')
    await app.restoreOrg(created.id)
    expect({
      request: sent[0],
      created: listed,
      chosen,
      catalogue: valueOf(model.repositories.get())?.length,
      renamed,
      restored: tile(created.id),
    }).toEqual({
      request: {
        method: 'POST',
        path: API_PATHS.orgs,
        body: { name: 'Acme Labs', initials: 'AL', repositoryIds: [5, 6] },
      },
      created: {
        id: 'acme-labs',
        name: 'Acme Labs',
        initials: 'AL',
        role: 'admin',
      },
      chosen: ['acme/mobile-app', 'acme/data-pipeline'],
      catalogue: 9,
      renamed: {
        id: 'acme-labs',
        name: 'Acme Lab',
        initials: 'AL',
        role: 'admin',
      },
      restored: {
        id: 'acme-labs',
        name: 'Acme Lab',
        initials: 'LB',
        role: 'admin',
      },
    })
  })
})
