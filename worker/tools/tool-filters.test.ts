import { expect, it } from 'vitest'

import { ToolInputError } from '../../tools/input'
import { listWorkspacesInput } from '../../tools/list-input'
import { workspaceDetail } from '../../tools/responses'
import { workspaceLink } from '../data/workspace-link'

it('accepts only booleans for the removed workspace filter', () => {
  expect(listWorkspacesInput({})).toEqual({})
  expect(listWorkspacesInput({ removed: true })).toEqual({ removed: true })
  expect(listWorkspacesInput({ removed: false })).toEqual({ removed: false })
  for (const removed of ['true', 1, null]) {
    expect(() => listWorkspacesInput({ removed }), String(removed)).toThrow(
      new ToolInputError('Choose true or false for removed workspaces.'),
    )
  }
})

it('reads nullable removal times and rejects malformed removal times', () => {
  const detail = {
    id: 'removed-workspace',
    number: 4,
    link: workspaceLink('https://conductive.test', 'org', 'removed-workspace'),
    name: 'Earlier work',
    branch: 'owner/earlier-work',
    state: 'archived',
    owner: { id: 'owner', githubLogin: 'owner-login', displayName: null },
    repository: {
      id: 'repo',
      fullName: 'example/repository',
      defaultBranch: 'main',
    },
    baseBranch: 'main',
    section: { id: 'general', name: 'General' },
    createdAt: 0,
    lastActivityAt: 0,
    archivedAt: 0,
    restoreUntil: null,
  }
  for (const removedAt of [null, 1_209_600_000]) {
    expect(
      workspaceDetail({ workspace: { ...detail, removedAt } }),
      String(removedAt),
    ).toMatchObject({ workspace: { state: 'archived', removedAt } })
  }
  for (const removedAt of [undefined, '1209600000', false, NaN, Infinity]) {
    expect(
      () => workspaceDetail({ workspace: { ...detail, removedAt } }),
      String(removedAt),
    ).toThrow(new ToolInputError('The workspace reply is not valid.'))
  }
})
