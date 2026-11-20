import { describe, expect, test } from 'vitest'
import { createMembersApi } from '../members/api/client'
import { API_PATHS, orgPath } from '../shared/api'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_ORIGIN, FAKE_TIME } from '../test-support/fixtures/core'
import { AppModel } from './app-model'
import { nested, record } from './api/parse'
import { readOrg } from './api/read-core'
import { createBackend, guardScope } from './dev/backend'
import { readDevOptions } from './dev/options'
import { orgRoutes } from './dev/org-routes'
import { routeFetch } from './dev/router'
import { seedState } from './dev/seed'
import { settingsRoutes } from './dev/settings-routes'
import { valueOf } from './store'
import { testServices } from './test-kit'

function signal() {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

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
  let held: { snapshot: () => void; released: Promise<void> } | null = null
  const holdPatchReply = () => {
    const snapshot = signal()
    const released = signal()
    held = { snapshot: snapshot.resolve, released: released.promise }
    return { ready: snapshot.promise, release: released.resolve }
  }
  const app = new AppModel(
    testServices(server, {
      fetch: async (input, init) => {
        const request = new Request(new URL(input, FAKE_ORIGIN), init)
        const hold = request.method === 'PATCH' ? held : null
        if (hold) held = null
        if (request.method !== 'GET') {
          sent.push({
            method: request.method,
            path: new URL(request.url).pathname,
            body: await request.clone().json(),
          })
        }
        const response = await answer(input, init)
        if (hold) {
          hold.snapshot()
          await hold.released
        }
        return response
      },
    }),
  )
  await app.start()
  const saved = (id: string) =>
    app.services.api.get(orgPath(id), (body) =>
      nested(record(body), 'org', readOrg),
    )
  return { app, sent, saved, holdPatchReply }
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
    // Delete org and Restore of the members UI give their answers to the app.
    const members = createMembersApi(app.services.api.fetch)
    app.putOrg(await members.deleteOrg(created.id, { name: 'Acme Lab' }))
    app.putOrg(await members.restoreOrg(created.id))
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

  test('a held colour reply keeps the later trimmed name and an initials-only save', async () => {
    const { app, sent, saved, holdPatchReply } = await startedOverDevRoutes()
    const held = holdPatchReply()
    const color = app.setOrgColor('acme', 'green')
    await held.ready
    await app.renameOrg('acme', { name: '  Renamed  ', initials: 'RN' })
    held.release()
    await color

    const expected = {
      id: 'acme',
      name: 'Renamed',
      initials: 'RN',
      color: 'green',
      role: 'admin',
    }
    const shown = () => app.orgs.get().find((org) => org.id === 'acme')
    expect({ shown: shown(), saved: await saved('acme') }).toEqual({
      shown: expected,
      saved: expected,
    })

    await app.renameOrg('acme', { name: shown()?.name ?? '', initials: 'RL' })
    expect({ shown: shown(), saved: await saved('acme') }).toEqual({
      shown: { ...expected, initials: 'RL' },
      saved: { ...expected, initials: 'RL' },
    })
    expect(sent.map((request) => request.body)).toEqual([
      { color: 'green' },
      { name: '  Renamed  ', initials: 'RN' },
      { name: 'Renamed', initials: 'RL' },
    ])
  })

  test('a held rename reply keeps the later colour and the trimmed name', async () => {
    const { app, saved, holdPatchReply } = await startedOverDevRoutes()
    const held = holdPatchReply()
    const rename = app.renameOrg('acme', { name: '  Renamed  ' })
    await held.ready
    await app.setOrgColor('acme', 'green')
    held.release()
    await rename

    const expected = {
      id: 'acme',
      name: 'Renamed',
      initials: 'AC',
      color: 'green',
      role: 'admin',
    }
    expect({
      shown: app.orgs.get().find((org) => org.id === 'acme'),
      saved: await saved('acme'),
    }).toEqual({ shown: expected, saved: expected })
  })

  test('partial saves take requested reply fields and keep all other current fields', async () => {
    const server = new FakeApiServer()
    const app = new AppModel(testServices(server))
    await app.start()
    const kept = {
      id: 'acme',
      role: 'admin' as const,
      suspension: { suspendedAt: FAKE_TIME },
      deletion: { deletedAt: FAKE_TIME, deletesAt: FAKE_TIME + 604_800_000 },
    }
    const current = { ...kept, name: 'Acme', initials: 'AC', color: 'green' }
    app.putOrg(current)
    const shown = () => app.orgs.get().find((org) => org.id === 'acme')
    const reply = { id: 'acme', name: 'Trimmed', role: 'member' }
    server.json('PATCH', orgPath('acme'), {
      org: { ...reply, initials: 'OLD', color: 'purple' },
    })
    await app.renameOrg('acme', { name: '  Trimmed  ' })
    expect(shown()).toStrictEqual({ ...current, name: 'Trimmed' })

    server.json('PATCH', orgPath('acme'), { org: reply })
    await app.renameOrg('acme', { name: '  Trimmed  ', initials: 'NEW' })
    expect(shown()).toStrictEqual({ ...kept, name: 'Trimmed', color: 'green' })

    await app.setOrgColor('acme', 'blue')
    expect(shown()).toStrictEqual({ ...kept, name: 'Trimmed' })
  })

  test('a partial save does not add an org that the list does not have', async () => {
    const server = new FakeApiServer()
    const app = new AppModel(testServices(server))
    await app.start()
    const before = app.orgs.get()
    server.json('PATCH', orgPath('unlisted'), {
      org: { id: 'unlisted', name: 'Unlisted', role: 'admin' },
    })
    await app.renameOrg('unlisted', { name: 'Unlisted' })
    await app.setOrgColor('unlisted', 'green')
    expect(app.orgs.get()).toEqual(before)
  })
})
