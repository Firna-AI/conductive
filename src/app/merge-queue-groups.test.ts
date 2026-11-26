import type { Workspace } from '../shared/generated/Workspace'
import { describe, expect, test } from 'vitest'
import { coreFixtures, FAKE_TIME } from '../test-support/fixtures/core'
import { withMergeQueue } from '../test-support/fixtures/merge-queue'
import { withSubWorkspaces } from '../test-support/fixtures/sub-workspaces'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { groupWorkspaces, moveWorkspace } from './sections'

const sections = coreFixtures().sectionList.sections

function trees(workspaces: readonly Workspace[]) {
  const groups = groupWorkspaces(sections, workspaces, FAKE_TIME)
  const checkout = groups.sections.find(
    (group) => group.section.id === 'checkout',
  )
  return {
    queued: groups.queued.map((item) => item.id),
    checkout: checkout?.rows.map(
      (row) => `${'  '.repeat(row.depth)}${row.workspace.id}`,
    ),
  }
}

const base = withSubWorkspaces(workspaceFixtures().workspaces.workspaces)

describe('a queued workspace in the list (decision 318)', () => {
  test('leaves its section, and its live sub-workspaces show under the nearest workspace above them that is not queued', () => {
    // Places API client has an open pull request, so it can be queued.
    const opened = base.map((item) =>
      item.id === 'places-client'
        ? { ...item, github: 'checks-running' as const }
        : item,
    )
    const queued = withMergeQueue(opened, [
      ['checkout-autocomplete'],
      ['places-client'],
    ])
    expect(trees(queued)).toEqual({
      queued: ['places-client', 'checkout-autocomplete'],
      checkout: [
        'suggestion-list',
        'address-search-api',
        '  rate-limits',
        '  rate-limit-load-test',
        'fix-cart-flake',
        'webhook-retries',
        'apple-pay',
        '  merchant-validation',
        '  wallet-button-tests',
      ],
    })
  })

  test('puts the sub-workspaces back under it when it leaves the queue', () => {
    const queued = withMergeQueue(base, [['apple-pay']])
    expect(trees(queued).checkout).toContain('merchant-validation')
    const left = queued.map((item) => {
      if (item.id !== 'apple-pay') return item
      const copy = { ...item }
      delete copy.mergeQueue
      return copy
    })
    expect(trees(left).checkout).toContain('  merchant-validation')
  })

  test('an archived workspace stays in the Archived group, also with an old entry, and a move of a queued workspace changes nothing', () => {
    const queued = withMergeQueue(base, [['apple-pay']]).map((item) =>
      item.id === 'apple-pay'
        ? { ...item, state: 'archived' as const, archivedAt: FAKE_TIME - 1 }
        : item,
    )
    const groups = groupWorkspaces(sections, queued, FAKE_TIME)
    expect(groups.queued).toEqual([])
    expect(groups.archived.map((item) => item.id)).toContain('apple-pay')
    const live = withMergeQueue(base, [['apple-pay']])
    expect(moveWorkspace(live, sections, 'apple-pay', 'general', 0)).toEqual(
      live,
    )
  })
})
