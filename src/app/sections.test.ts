import { describe, expect, test } from 'vitest'
import { coreFixtures, FAKE_TIME } from '../test-support/fixtures/core'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { groupWorkspaces, stepTarget } from './sections'

const sections = coreFixtures().sectionList.sections
const workspaces = workspaceFixtures().workspaces.workspaces

function names(groups: ReturnType<typeof groupWorkspaces>) {
  return groups.sections.map((group) => [
    group.section.name,
    group.workspaces.map((workspace) => workspace.id),
  ])
}

describe('groupWorkspaces', () => {
  test('an unknown section falls back to General, and archived ones go last', () => {
    const lost = { ...workspaces[3], sectionId: 'deleted-section' }
    const archived = {
      ...workspaces[0],
      state: 'archived' as const,
      archivedAt: FAKE_TIME,
    }
    const groups = groupWorkspaces(sections, [
      archived,
      ...workspaces.slice(1, 3),
      lost,
    ])
    expect(names(groups)).toEqual([
      ['General', [workspaces[1].id, workspaces[2].id, lost.id]],
      ['Checkout', []],
      ['Infra', []],
    ])
    expect(groups.archived.map((workspace) => workspace.id)).toEqual([
      archived.id,
    ])
  })
})

describe('stepTarget', () => {
  test('a step past a section goes to the next open section', () => {
    const groups = groupWorkspaces(sections, workspaces).sections
    const [general, checkout] = groups
    const lastOfGeneral = general.workspaces.at(-1)
    const firstOfCheckout = checkout.workspaces[0]
    if (!lastOfGeneral || !firstOfCheckout) throw new Error('No sample rows.')
    expect(stepTarget(groups, lastOfGeneral.id, 1)).toEqual({
      sectionId: 'checkout',
      index: 0,
    })
    expect(stepTarget(groups, firstOfCheckout.id, -1)).toEqual({
      sectionId: 'general',
      index: general.workspaces.length,
    })
    const lastOfCheckout = checkout.workspaces.at(-1)
    if (!lastOfCheckout) throw new Error('No sample rows.')
    // Infra is collapsed, so the last row of Checkout has no step down.
    expect(stepTarget(groups, lastOfCheckout.id, 1)).toBeNull()
  })
})
