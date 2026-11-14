import { expect, test } from 'vitest'
import {
  repositoryBranchesPath,
  type RepositoryBranchesResponse,
} from '../shared/branches'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { createApiClient } from './api/client'
import { BranchLists } from './branch-lists'
import { HeldRequests } from './test-kit'

const path = repositoryBranchesPath(FAKE_IDS.org, 'storefront')

function listOf(...names: string[]): RepositoryBranchesResponse {
  return {
    branches: names.map((name) => ({ name, committedAt: null })),
  }
}

/** The state of a list in short: loading, failed, or its branch names. */
function shown(lists: BranchLists): string {
  const list = lists.of('storefront').store.get()
  if (list.state === 'ready') {
    return list.value.branches.map((branch) => branch.name).join(', ')
  }
  return list.state
}

test('each read loads until its answer, only the answer of the newest read shows, and a read after a failure loads again', async () => {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const lists = new BranchLists(createApiClient(held.fetch), FAKE_IDS.org)
  const list = lists.of('storefront')
  const states: string[] = [shown(lists)]
  server.json('GET', path, listOf('main', 'develop'))
  await list.read()
  states.push(shown(lists))
  // An older read answers after a newer one, and changes nothing.
  held.holdAnswer('GET', path)
  server.json('GET', path, listOf('main', 'stale'))
  const older = list.read()
  server.json('GET', path, listOf('main', 'develop', 'release'))
  const newer = list.read()
  states.push(shown(lists))
  await newer
  held.release('GET', path)
  await older
  states.push(shown(lists))
  server.json(
    'GET',
    path,
    { error: { code: 'github_unavailable', message: 'GitHub is down.' } },
    502,
  )
  await list.read()
  states.push(shown(lists))
  server.json('GET', path, listOf('main'))
  held.hold('GET', path)
  const retry = list.read()
  states.push(shown(lists))
  held.release('GET', path)
  await retry
  states.push(shown(lists))
  expect(states).toEqual([
    'loading',
    'main, develop',
    'loading',
    'main, develop, release',
    'failed',
    'loading',
    'main',
  ])
})
