import { describe, expect, test } from 'vitest'
import type { Workspace } from '../shared/generated/Workspace'
import { coreFixtures, FAKE_TIME } from '../test-support/fixtures/core'
import { withSubWorkspaces } from '../test-support/fixtures/sub-workspaces'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { groupWorkspaces, moveWorkspace, stepTarget } from './sections'

const sections = coreFixtures().sectionList.sections
const workspaces = workspaceFixtures().workspaces.workspaces
/** The list of Acme with the two trees of the mockups in Checkout. */
const trees = withSubWorkspaces(workspaces)

function names(groups: ReturnType<typeof groupWorkspaces>) {
  return groups.sections.map((group) => [
    group.section.name,
    group.rows.map((row) => row.workspace.id),
  ])
}

/** The rows of each section, by ID, each with its depth. */
function shapes(groups: ReturnType<typeof groupWorkspaces>) {
  return Object.fromEntries(
    groups.sections.map((group) => [
      group.section.id,
      group.rows.map((row) => `${row.workspace.id} ${row.depth}`),
    ]),
  )
}

/** The list with one workspace archived. */
function archive(list: readonly Workspace[], workspaceId: string) {
  return list.map((workspace) =>
    workspace.id === workspaceId
      ? { ...workspace, state: 'archived' as const, archivedAt: FAKE_TIME }
      : workspace,
  )
}

describe('groupWorkspaces', () => {
  test('an unknown section falls back to General, and archived ones go last', () => {
    const lost = { ...workspaces[3], sectionId: 'deleted-section' }
    const archived = {
      ...workspaces[0],
      state: 'archived' as const,
      archivedAt: FAKE_TIME,
    }
    const groups = groupWorkspaces(
      sections,
      [archived, ...workspaces.slice(1, 3), lost],
      FAKE_TIME,
    )
    expect(names(groups)).toEqual([
      ['General', [workspaces[1].id, workspaces[2].id, lost.id]],
      ['Checkout', []],
      ['Infra', []],
    ])
    expect(groups.archived.map((workspace) => workspace.id)).toEqual([
      archived.id,
    ])
  })

  test('the Archived group leaves out each workspace whose 14 days ended by the time of the list, from their exact end, also without a kept cloud computer', () => {
    const days14 = 14 * 86_400_000
    const archived = (
      id: string,
      archivedAt: number,
      restoreUntil: number | null,
    ): Workspace => ({
      ...workspaces[0],
      id,
      state: 'archived',
      archivedAt,
      restoreUntil,
    })
    const groups = groupWorkspaces(
      sections,
      [
        archived('ends-now', FAKE_TIME - days14, FAKE_TIME),
        archived('ends-next', FAKE_TIME - days14 + 1, FAKE_TIME + 1),
        archived('no-computer', FAKE_TIME - days14 + 2, null),
        archived('no-computer-ended', FAKE_TIME - days14 - 1, null),
      ],
      FAKE_TIME,
    )
    expect(groups.archived.map((workspace) => workspace.id)).toEqual([
      'no-computer',
      'ends-next',
    ])
  })

  test('a section shows each top-level row with its sub-workspaces under it, oldest first, and a row whose parent is archived under the nearest live row above it', () => {
    const tree = shapes(groupWorkspaces(sections, trees, FAKE_TIME)).checkout
    const archivedParent = shapes(
      groupWorkspaces(sections, archive(trees, 'places-client'), FAKE_TIME),
    ).checkout
    expect({ tree, archivedParent }).toEqual({
      tree: [
        'fix-cart-flake 0',
        'webhook-retries 0',
        'apple-pay 0',
        'merchant-validation 1',
        'wallet-button-tests 1',
        'checkout-autocomplete 0',
        'address-search-api 1',
        'places-client 2',
        'rate-limits 3',
        'rate-limit-load-test 3',
        'suggestion-list 1',
      ],
      archivedParent: [
        'fix-cart-flake 0',
        'webhook-retries 0',
        'apple-pay 0',
        'merchant-validation 1',
        'wallet-button-tests 1',
        'checkout-autocomplete 0',
        'address-search-api 1',
        'rate-limits 2',
        'rate-limit-load-test 2',
        'suggestion-list 1',
      ],
    })
  })
})

describe('moveWorkspace', () => {
  test('a move puts the tree of a top-level row at its place among the top-level rows and gives each workspace of the tree the section, and a move of a nested row changes nothing', () => {
    // Places API client is archived, and it moves with its tree too.
    const list = archive(trees, 'places-client')
    const toGeneral = moveWorkspace(
      list,
      sections,
      'checkout-autocomplete',
      'general',
      1,
    )
    // The index counts only the top-level rows, so place 2 lies past the
    // whole tree of Apple Pay button.
    const inCheckout = moveWorkspace(
      list,
      sections,
      'fix-cart-flake',
      'checkout',
      2,
    )
    const sectionOf = (workspaceId: string) =>
      toGeneral.find((workspace) => workspace.id === workspaceId)?.sectionId
    expect({
      general: shapes(groupWorkspaces(sections, toGeneral, FAKE_TIME)).general,
      tree: [
        'address-search-api',
        'places-client',
        'rate-limits',
        'rate-limit-load-test',
        'suggestion-list',
      ].map(sectionOf),
      checkout: shapes(groupWorkspaces(sections, inCheckout, FAKE_TIME))
        .checkout,
      nested: moveWorkspace(list, sections, 'address-search-api', 'general', 0),
    }).toEqual({
      general: [
        'email-dark-mode 0',
        'checkout-autocomplete 0',
        'address-search-api 1',
        'rate-limits 2',
        'rate-limit-load-test 2',
        'suggestion-list 1',
        'invoice-fonts 0',
        'pricing-copy 0',
      ],
      tree: ['general', 'general', 'general', 'general', 'general'],
      checkout: [
        'webhook-retries 0',
        'apple-pay 0',
        'merchant-validation 1',
        'wallet-button-tests 1',
        'fix-cart-flake 0',
        'checkout-autocomplete 0',
        'address-search-api 1',
        'rate-limits 2',
        'rate-limit-load-test 2',
        'suggestion-list 1',
      ],
      nested: list,
    })
  })
})

describe('stepTarget', () => {
  test('a step past a section goes to the next open section', () => {
    const groups = groupWorkspaces(sections, workspaces, FAKE_TIME).sections
    const [general, checkout] = groups
    const lastOfGeneral = general.rows.at(-1)?.workspace
    const firstOfCheckout = checkout.rows[0]?.workspace
    if (!lastOfGeneral || !firstOfCheckout) throw new Error('No sample rows.')
    expect(stepTarget(groups, lastOfGeneral.id, 1)).toEqual({
      sectionId: 'checkout',
      index: 0,
    })
    expect(stepTarget(groups, firstOfCheckout.id, -1)).toEqual({
      sectionId: 'general',
      index: general.rows.length,
    })
    const lastOfCheckout = checkout.rows.at(-1)?.workspace
    if (!lastOfCheckout) throw new Error('No sample rows.')
    // Infra is collapsed, so the last row of Checkout has no step down.
    expect(stepTarget(groups, lastOfCheckout.id, 1)).toBeNull()
  })

  test('a step of a top-level row passes the whole tree next to it, a step into a section counts only its top-level rows, and a nested row has no step', () => {
    const open = sections.map((section) => ({ ...section, collapsed: false }))
    const groups = groupWorkspaces(open, trees, FAKE_TIME).sections
    expect({
      up: stepTarget(groups, 'checkout-autocomplete', -1),
      down: stepTarget(groups, 'apple-pay', 1),
      intoCheckout: stepTarget(groups, 'next-16', -1),
      nested: stepTarget(groups, 'merchant-validation', 1),
    }).toEqual({
      up: { sectionId: 'checkout', index: 2 },
      down: { sectionId: 'checkout', index: 3 },
      intoCheckout: { sectionId: 'checkout', index: 4 },
      nested: null,
    })
  })
})
