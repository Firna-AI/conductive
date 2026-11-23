import { describe, expect, test } from 'vitest'
import { mergeQueuePaths } from '../shared/merge-queue'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
import {
  billingQueue,
  storefrontQueue,
  withMergeQueue,
} from '../test-support/fixtures/merge-queue'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { queueBlocks } from './merge-queue'
import {
  addToMergeQueue,
  moveInMergeQueue,
  removeFromMergeQueue,
} from './merge-queue-actions'
import { OrgModel } from './org-model'
import { groupWorkspaces } from './sections'
import { valueOf } from './store'
import { HeldRequests, testServices } from './test-kit'

const org = FAKE_IDS.org
const refused = {
  error: { code: 'merge_queue_changed', message: 'Try again.' },
}

/** A server whose list holds the two queues of the fixture. */
function queueServer() {
  const server = new FakeApiServer()
  const workspaces = withMergeQueue(workspaceFixtures().workspaces.workspaces, [
    ...storefrontQueue,
    ...billingQueue,
  ])
  server.json('GET', workspacesPath(org), { workspaces })
  return server
}

async function loaded(server: FakeApiServer, held: HeldRequests) {
  const model = new OrgModel(testServices(server, { fetch: held.fetch }), org)
  await model.reload('list')
  return model
}

/** The entries of each queue, and the rows of Checkout, as the list shows them. */
function shown(model: OrgModel) {
  const groups = groupWorkspaces(
    valueOf(model.sections.get()) ?? [],
    valueOf(model.workspaces.get()) ?? [],
    FAKE_TIME,
  )
  const checkout = groups.sections.find(
    (group) => group.section.id === 'checkout',
  )
  return {
    queues: queueBlocks(groups.queued, []).map((block) =>
      block.entries.map((item) => item.id),
    ),
    checkout: checkout?.rows.map((row) => row.workspace.id),
  }
}

const caught = (error: unknown) => error

describe('the writes of the merge queue', () => {
  test('a re-order sends the unit that it goes before, shows at once, and reads the list after the answer', async () => {
    const server = queueServer()
    const held = new HeldRequests(server)
    const path = mergeQueuePaths.order(org, 'checkout-autocomplete')
    server.empty('PUT', path)
    const model = await loaded(server, held)
    held.hold('PUT', path)
    const moving = moveInMergeQueue(model, 'checkout-autocomplete', 'next-16')
    expect(shown(model).queues[1]).toEqual([
      'checkout-autocomplete',
      'next-16',
      'fix-cart-flake',
      'apple-pay',
    ])
    const sent = server.requests.length
    held.release('PUT', path)
    await moving
    expect(await server.requests[sent]?.json()).toEqual({
      beforeWorkspaceId: 'next-16',
    })
    await Promise.resolve()
    expect(
      server.requests
        .slice(sent + 1)
        .some((request) => request.url.endsWith(workspacesPath(org))),
    ).toBe(true)
  })

  test('a re-order that the Worker refuses puts the entries back, and a member stack moves as one unit', async () => {
    const server = queueServer()
    const held = new HeldRequests(server)
    const path = mergeQueuePaths.order(org, 'webhook-retries')
    server.json('PUT', path, refused, 409)
    const model = await loaded(server, held)
    const before = shown(model).queues
    held.hold('PUT', path)
    const moving = moveInMergeQueue(model, 'webhook-retries', null).catch(
      caught,
    )
    expect(shown(model).queues[0]).toEqual(['webhook-retries', 'retry-queue'])
    held.release('PUT', path)
    expect(await moving).toMatchObject({ code: 'merge_queue_changed' })
    expect(shown(model).queues).toEqual(before)
  })

  test('Add shows the workspace at the end of its queue and out of its section, and a refusal puts it back', async () => {
    const server = new FakeApiServer()
    const workspaces = withMergeQueue(
      workspaceFixtures().workspaces.workspaces,
      [['next-16'], ['apple-pay']],
    )
    server.json('GET', workspacesPath(org), { workspaces })
    const held = new HeldRequests(server)
    const path = mergeQueuePaths.entry(org, 'checkout-autocomplete')
    server.json('POST', path, refused, 409)
    const model = await loaded(server, held)
    held.hold('POST', path)
    const adding = addToMergeQueue(model, 'checkout-autocomplete').catch(caught)
    expect(shown(model)).toEqual({
      queues: [['next-16', 'apple-pay', 'checkout-autocomplete']],
      checkout: ['fix-cart-flake', 'webhook-retries'],
    })
    held.release('POST', path)
    expect(await adding).toMatchObject({ code: 'merge_queue_changed' })
    expect(shown(model)).toEqual({
      queues: [['next-16', 'apple-pay']],
      checkout: ['fix-cart-flake', 'webhook-retries', 'checkout-autocomplete'],
    })
  })

  test('Remove takes the entry and the entries above it in its unit out, and the places close up', async () => {
    const server = queueServer()
    const held = new HeldRequests(server)
    const stack = mergeQueuePaths.entry(org, 'webhook-retries')
    const alone = mergeQueuePaths.entry(org, 'fix-cart-flake')
    server.empty('DELETE', stack)
    server.empty('DELETE', alone)
    const model = await loaded(server, held)
    held.hold('DELETE', stack)
    held.hold('DELETE', alone)
    const leaving = removeFromMergeQueue(model, 'webhook-retries')
    const removing = removeFromMergeQueue(model, 'fix-cart-flake')
    expect(shown(model).queues).toEqual([
      ['next-16', 'apple-pay', 'checkout-autocomplete'],
    ])
    const places = valueOf(model.workspaces.get())
      ?.filter((item) => item.repositoryId === 'storefront' && item.mergeQueue)
      .map((item) => item.mergeQueue?.place)
    expect(places?.sort()).toEqual([1, 2, 3])
    held.release('DELETE', stack)
    held.release('DELETE', alone)
    await Promise.all([leaving, removing])
  })
})
