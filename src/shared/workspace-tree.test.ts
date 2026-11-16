import { expect, it } from 'vitest'

import { placeWorkspaces, type TreeWorkspace } from './workspace-tree'

const sections = [
  { id: 'general', position: 0, isDefault: true },
  { id: 'other', position: 1, isDefault: false },
]

function row(
  id: string,
  parentId: string | null,
  createdAt: number,
  sectionId = 'general',
  state: TreeWorkspace['state'] = 'ready',
): TreeWorkspace {
  return { id, parentId, sectionId, state, createdAt }
}

function places(workspaces: readonly TreeWorkspace[]) {
  return placeWorkspaces(workspaces, sections).map(
    ({ workspace, sectionId, parentId, depth }) => [
      workspace.id,
      sectionId,
      parentId,
      depth,
    ],
  )
}

it('places four levels in tree order with oldest children first', () => {
  expect(
    places([
      row('next-root', null, 1),
      row('latest', 'root', 9),
      row('root', null, 2),
      row('deepest', 'middle', 7),
      row('middle', 'oldest', 6),
      row('oldest', 'root', 5),
    ]),
  ).toEqual([
    ['next-root', 'general', null, 0],
    ['root', 'general', null, 0],
    ['oldest', 'general', 'root', 1],
    ['middle', 'general', 'oldest', 2],
    ['deepest', 'general', 'middle', 3],
    ['latest', 'general', 'root', 1],
  ])
})

it('shows a child in the section of its shown parent', () => {
  expect(
    places([row('child', 'parent', 2), row('parent', null, 1, 'other')]),
  ).toEqual([
    ['parent', 'other', null, 0],
    ['child', 'other', 'parent', 1],
  ])
})

it('replaces an archived middle row in place without sorting its children among their new siblings', () => {
  expect(
    places([
      row('root', null, 1),
      row('archived', 'root', 2, 'general', 'archived'),
      row('sibling', 'root', 3),
      row('late-child', 'archived', 9),
      row('early-child', 'archived', 8),
      row('grandchild', 'early-child', 10),
    ]),
  ).toEqual([
    ['root', 'general', null, 0],
    ['early-child', 'general', 'root', 1],
    ['grandchild', 'general', 'early-child', 2],
    ['late-child', 'general', 'root', 1],
    ['sibling', 'general', 'root', 1],
  ])
})

it('replaces an archived top row at its existing place', () => {
  expect(
    places([
      row('before', null, 2),
      row('archived', null, 1, 'general', 'archived'),
      row('after', null, 3),
      row('late-child', 'archived', 9),
      row('early-child', 'archived', 8),
    ]),
  ).toEqual([
    ['before', 'general', null, 0],
    ['early-child', 'general', null, 0],
    ['late-child', 'general', null, 0],
    ['after', 'general', null, 0],
  ])
})

it('uses its own section when every ancestor is archived', () => {
  expect(
    places([
      row('root', null, 1, 'general', 'archived'),
      row('middle', 'root', 2, 'general', 'archived'),
      row('child', 'middle', 3, 'other'),
      row('grandchild', 'child', 4),
    ]),
  ).toEqual([
    ['child', 'other', null, 0],
    ['grandchild', 'other', 'child', 1],
  ])
})

it('uses General for an unknown section', () => {
  expect(places([row('unknown', null, 1, 'missing')])).toEqual([
    ['unknown', 'general', null, 0],
  ])
})
