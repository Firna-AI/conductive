import { describe, expect, test } from 'vitest'
import { repositoryPath } from '../shared/org-settings'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_ORIGIN, FAKE_TIME } from '../test-support/fixtures/core'
import { createBackend, guardScope } from './dev/backend'
import { readDevOptions } from './dev/options'
import { routeFetch } from './dev/router'
import { seedState } from './dev/seed'
import { settingsRoutes } from './dev/settings-routes'
import { OrgModel } from './org-model'
import { setRepositorySelected } from './settings-actions'
import { valueOf } from './store'
import { flushMicrotasks, testServices } from './test-kit'

const orgId = FAKE_IDS.org
const initial = [
  'acme/storefront',
  'acme/billing-service',
  'acme/marketing-site',
]
const added = [...initial, 'acme/admin-dashboard', 'acme/mobile-app']

/** Two real API clients can share these stateful dev routes. */
function statefulService() {
  const server = new FakeApiServer()
  const backend = createBackend(
    seedState(readDevOptions('')),
    server.events,
    () => FAKE_TIME,
    () => 'unused',
  )
  const answer = routeFetch(
    settingsRoutes(backend),
    (path) => guardScope(backend.state, path),
    server.fetch,
  )
  const requests: Request[] = []
  let waiting: Promise<void> | null = null
  let release: () => void = () => undefined
  const fetch = async (input: string, init?: RequestInit) => {
    requests.push(new Request(new URL(input, FAKE_ORIGIN), init))
    const held = init?.method === 'GET' ? null : waiting
    if (held) waiting = null
    const response = await answer(input, init)
    if (held) await held
    return response
  }
  return {
    requests,
    model: () => new OrgModel(testServices(server, { fetch }), orgId),
    holdAnswer: () => {
      waiting = new Promise<void>((resolve) => {
        release = resolve
      })
    },
    release: () => release(),
  }
}

function choices(model: OrgModel) {
  const repositories = valueOf(model.repositories.get())
  if (!repositories) throw new Error('The repositories did not load.')
  return repositories
}

function repository(model: OrgModel, name: string) {
  const found = choices(model).find((item) => item.fullName === name)
  if (!found) throw new Error(`Missing repository: ${name}`)
  return found
}

function selected(model: OrgModel) {
  return choices(model)
    .filter((item) => item.selected)
    .map((item) => item.fullName)
}

async function mutations(requests: readonly Request[]) {
  return Promise.all(
    requests
      .filter((request) => request.method !== 'GET')
      .map(async (request) => ({
        method: request.method,
        path: new URL(request.url).pathname,
        body: await request.clone().json(),
      })),
  )
}

describe('repository selection', () => {
  test('queued saves keep both additions and order an add before a remove of the same repository', async () => {
    const service = statefulService()
    const model = service.model()
    await model.reload('repositories')
    service.holdAnswer()
    const first = setRepositorySelected(
      model,
      repository(model, 'acme/admin-dashboard'),
      true,
    )
    const second = setRepositorySelected(
      model,
      repository(model, 'acme/mobile-app'),
      true,
    )
    await flushMicrotasks()
    expect(
      service.requests.filter((request) => request.method !== 'GET'),
    ).toHaveLength(1)
    service.release()
    await Promise.all([first, second])
    await model.reload('repositories')
    expect(selected(model)).toEqual(added)

    const pipeline = repository(model, 'acme/data-pipeline')
    service.holdAnswer()
    const adding = setRepositorySelected(model, pipeline, true)
    const removing = setRepositorySelected(model, pipeline, false)
    await flushMicrotasks()
    expect(
      service.requests.filter((request) => request.method !== 'GET'),
    ).toHaveLength(3)
    service.release()
    await Promise.all([adding, removing])
    await model.reload('repositories')
    expect(selected(model)).toEqual(added)
    expect(await mutations(service.requests)).toEqual([
      {
        method: 'PUT',
        path: repositoryPath(orgId, 'admin-dashboard'),
        body: {},
      },
      { method: 'PUT', path: repositoryPath(orgId, 'mobile-app'), body: {} },
      { method: 'PUT', path: repositoryPath(orgId, pipeline.id), body: {} },
      { method: 'DELETE', path: repositoryPath(orgId, pipeline.id), body: {} },
    ])
  })

  test('two client models preserve each other’s repository additions against one service', async () => {
    const service = statefulService()
    const first = service.model()
    const second = service.model()
    await Promise.all([
      first.reload('repositories'),
      second.reload('repositories'),
    ])
    await setRepositorySelected(
      first,
      repository(first, 'acme/admin-dashboard'),
      true,
    )
    await setRepositorySelected(
      second,
      repository(second, 'acme/mobile-app'),
      true,
    )
    await Promise.all([
      first.reload('repositories'),
      second.reload('repositories'),
    ])
    expect(selected(first)).toEqual(added)
    expect(selected(second)).toEqual(added)
    expect(await mutations(service.requests)).toEqual([
      {
        method: 'PUT',
        path: repositoryPath(orgId, 'admin-dashboard'),
        body: {},
      },
      { method: 'PUT', path: repositoryPath(orgId, 'mobile-app'), body: {} },
    ])
  })
})
