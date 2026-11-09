import { expect, it } from 'vitest'

import { canFillWorkspaceTitle } from './workspace-title'

it.each([
  { workspace: { name: null }, expected: true },
  { workspace: { name: 'Member name' }, expected: false },
  { workspace: { name: 'New session' }, expected: false },
  { workspace: { name: 'delft' }, expected: false },
  { workspace: null, expected: false },
])(
  'allows an automatic workspace title for $workspace: $expected',
  ({ workspace, expected }) => {
    expect(canFillWorkspaceTitle(workspace)).toBe(expected)
  },
)
