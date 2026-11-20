import { expect, it } from 'vitest'

import { count, maybeCount, maybeText, record, text } from '../app/api/parse'
import { readChoice, readSender } from '../app/api/read-core'
import type { Workspace } from './generated/Workspace'
import { createWorkspaceReader } from './workspace-read'

const readWorkspace = createWorkspaceReader({
  record,
  text,
  count,
  nullableText: maybeText,
  nullableCount: maybeCount,
  sender: readSender,
  choice: readChoice,
  invalidState: () => new Error('Unknown workspace state.'),
})

const workspace: Workspace = {
  id: 'workspace',
  number: 42,
  link: 'https://app.conductive.build/orgs/acme/workspaces/workspace',
  orgId: 'acme',
  repositoryId: 'repository',
  sectionId: 'section',
  parentId: null,
  owner: {
    id: 'owner',
    githubLogin: 'octocat',
    displayName: 'Octocat',
    avatarUrl: 'https://example.com/avatar.png',
  },
  name: 'Reader cleanup',
  branch: 'octocat/reader-cleanup',
  choice: {
    agent: 'codex',
    model: 'custom-model',
    effort: 'ultra',
    fast: true,
  },
  state: 'archived',
  github: 'checks-failed',
  createdAt: 1_800_000_000_000,
  updatedAt: 1_800_000_001_000,
  archivedAt: 1_800_000_002_000,
  restoreUntil: 1_801_209_602_000,
}

it('reads every workspace field and ignores extra fields', () => {
  expect(
    readWorkspace({
      ...workspace,
      extra: 'ignored',
      owner: { ...workspace.owner, githubId: 10 },
      choice: { ...workspace.choice, extra: 'ignored' },
    }),
  ).toEqual(workspace)
})

it('keeps a null workspace name until a name is set', () => {
  expect(readWorkspace({ ...workspace, name: null }).name).toBeNull()
})

it('keeps the parent of a nested workspace', () => {
  expect(readWorkspace({ ...workspace, parentId: 'parent' }).parentId).toBe(
    'parent',
  )
})
