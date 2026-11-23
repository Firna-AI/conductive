import type { Workspace } from '../shared/generated/Workspace'
import { describe, expect, test } from 'vitest'
import { joinRefusalText } from '../ui/components/workspace/queueCopy'
import {
  billingQueue,
  releaseBase,
  storefrontQueue,
  withMergeQueue,
} from '../test-support/fixtures/merge-queue'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import {
  isQueued,
  queueBlocks,
  queueStep,
  queueUnits,
  unitAbove,
  unitBefore,
  type QueueFacts,
} from './merge-queue'
import { joinCheck, mayRemove, queueMenuAction } from './merge-queue-join'

const repositories = [
  { id: 'storefront', fullName: 'acme/storefront', defaultBranch: 'main' },
  {
    id: 'billing-service',
    fullName: 'acme/billing-service',
    defaultBranch: 'main',
  },
]

function list(
  units: readonly (readonly string[])[] = [...storefrontQueue, ...billingQueue],
): Workspace[] {
  return withMergeQueue(workspaceFixtures().workspaces.workspaces, units)
}

function facts(workspaces = list()): QueueFacts {
  return { workspaces, repositories }
}

function one(workspaces: readonly Workspace[], id: string): Workspace {
  const found = workspaces.find((item) => item.id === id)
  if (!found) throw new Error(`The list has no ${id}.`)
  return found
}

const ids = (items: readonly Workspace[]) => items.map((item) => item.id)

describe('the blocks of the merge queue', () => {
  test('hold one block for each repository, in the order of the repositories, with the names and the entries from place 1', () => {
    const queued = list().filter(isQueued).reverse()
    const blocks = queueBlocks(queued, repositories)
    expect(blocks.map((block) => [block.name, ids(block.entries)])).toEqual([
      [
        'acme/storefront',
        ['next-16', 'fix-cart-flake', 'apple-pay', 'checkout-autocomplete'],
      ],
      ['acme/billing-service', ['webhook-retries', 'retry-queue']],
    ])
    // A repository that the list lacks comes last, with no name.
    expect(
      queueBlocks(queued, [repositories[1]]).map((block) => block.name),
    ).toEqual(['acme/billing-service', null])
  })

  test('group a member stack as one unit, and name the entries above an entry in its unit', () => {
    const [, billing] = queueBlocks(list().filter(isQueued), repositories)
    expect(queueUnits(billing.entries).map(ids)).toEqual([
      ['webhook-retries', 'retry-queue'],
    ])
    expect(ids(unitAbove(billing.entries, 'webhook-retries'))).toEqual([
      'retry-queue',
    ])
    expect(unitAbove(billing.entries, 'retry-queue')).toEqual([])
  })

  test('move a unit one step only inside its block, and give the unit that it goes before', () => {
    const [storefront] = queueBlocks(list().filter(isQueued), repositories)
    const { entries } = storefront
    expect(queueStep(entries, 'apple-pay', -1)).toEqual({
      before: 'fix-cart-flake',
      place: 2,
    })
    expect(queueStep(entries, 'apple-pay', 1)).toEqual({
      before: null,
      place: 4,
    })
    expect(queueStep(entries, 'next-16', -1)).toBe(null)
    expect(queueStep(entries, 'checkout-autocomplete', 1)).toBe(null)
    expect(unitBefore(entries, 'next-16', 2)).toBe('checkout-autocomplete')
    expect(unitBefore(entries, 'next-16', 3)).toBe(null)
  })
})

describe('who may join the merge queue', () => {
  test('a pull request into the default branch with write access can join', () => {
    const workspaces = list([])
    const check = joinCheck(one(workspaces, 'apple-pay'), facts(workspaces))
    expect(check).toEqual({ kind: 'can-join' })
  })

  test('names the reason of a branch without an open pull request, of a member without write access, and of another base', () => {
    const workspaces = list([])
    const of = (workspace: Workspace) => joinCheck(workspace, facts(workspaces))
    expect(of(one(workspaces, 'pricing-copy'))).toEqual({
      kind: 'refused',
      refusal: { kind: 'no-pull-request' },
    })
    expect(
      of({ ...one(workspaces, 'apple-pay'), githubCanWrite: false }),
    ).toEqual({
      kind: 'refused',
      refusal: { kind: 'write-access', repository: 'acme/storefront' },
    })
    expect(of(one(workspaces, 'invoice-fonts'))).toEqual({
      kind: 'refused',
      refusal: {
        kind: 'other-branch',
        base: { text: releaseBase },
        trunk: { text: 'main' },
      },
    })
  })

  test('names the fork, GitHub queue rule, and other org before a drop', () => {
    const workspaces = list([])
    const apple = one(workspaces, 'apple-pay')
    const check = (
      workspace: Workspace,
      flags: Partial<QueueFacts['repositories'][number]>,
    ) => {
      const result = joinCheck(workspace, {
        workspaces,
        repositories: [{ ...repositories[0], ...flags }],
      })
      return result.kind === 'refused' ? joinRefusalText(result.refusal) : null
    }
    expect(
      check(
        {
          ...apple,
          github: null,
          githubPullBase: undefined,
          githubPullFromFork: true,
        },
        {},
      ),
    ).toBe("Pull requests from forks can't join the queue.")
    expect(
      check(
        { ...apple, mergeQueueLabels: { defaultBranch: { text: 'trunk' } } },
        { defaultBranch: 'trunk', githubQueueRequired: true },
      ),
    ).toBe("trunk needs GitHub's own merge queue.")
    expect(check(apple, { queueInUse: true })).toBe(
      'Another org has a merge queue for this repository.',
    )
  })

  test('leaves the decision to the Worker while the list lacks the access, the base, or the repository', () => {
    const workspaces = list([])
    const apple = one(workspaces, 'apple-pay')
    const unknown = { kind: 'unknown' }
    expect(
      joinCheck({ ...apple, githubCanWrite: undefined }, facts(workspaces)),
    ).toEqual(unknown)
    expect(
      joinCheck({ ...apple, githubPullBase: undefined }, facts(workspaces)),
    ).toEqual(unknown)
    expect(joinCheck(apple, { workspaces, repositories: [] })).toEqual(unknown)
  })

  test('follows a member stack to the base of its lowest pull request, and joins on top of a queued lower one', () => {
    const base = list([])
    const upper = {
      ...one(base, 'checkout-autocomplete'),
      githubPullBase: one(base, 'apple-pay').branch,
    }
    const stacked = base.map((item) => (item.id === upper.id ? upper : item))
    expect(joinCheck(upper, facts(stacked))).toEqual({ kind: 'can-join' })
    const lowerOnRelease = stacked.map((item) =>
      item.id === 'apple-pay'
        ? {
            ...item,
            githubPullBase: releaseBase,
            mergeQueueLabels: {
              defaultBranch: { text: 'main' },
              pullBase: { text: releaseBase },
            },
          }
        : item,
    )
    expect(joinCheck(upper, facts(lowerOnRelease))).toEqual({
      kind: 'refused',
      refusal: {
        kind: 'other-branch',
        base: { text: releaseBase },
        trunk: { text: 'main' },
      },
    })
    // A queued lower pull request targets the layer below it in the queue.
    const queuedLower = withMergeQueue(base, [['apple-pay']]).map((item) =>
      item.id === upper.id
        ? upper
        : item.id === 'apple-pay'
          ? { ...item, githubPullBase: one(base, 'next-16').branch }
          : item,
    )
    expect(joinCheck(upper, facts(queuedLower))).toEqual({ kind: 'can-join' })
  })

  test('offers Add on a row that can join, Remove on an entry that may leave, and nothing else', () => {
    const workspaces = list(storefrontQueue)
    const action = (workspace: Workspace) =>
      queueMenuAction(workspace, facts(workspaces))
    expect(action(one(workspaces, 'webhook-retries'))).toBe('add')
    expect(action(one(workspaces, 'apple-pay'))).toBe('remove')
    expect(action(one(workspaces, 'invoice-fonts'))).toBe(undefined)
    const merging = one(workspaces, 'next-16')
    const busy: Workspace = {
      ...merging,
      mergeQueue: {
        queueId: 'queue-storefront',
        place: 1,
        unitId: 'unit-next-16',
        state: 'merging',
      },
    }
    expect(mayRemove(busy)).toBe(false)
    expect(action(busy)).toBe(undefined)
    expect(action({ ...merging, githubCanWrite: undefined })).toBe(undefined)
    expect(action({ ...merging, state: 'archived' })).toBe(undefined)
  })
})
