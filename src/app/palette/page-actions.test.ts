import { describe, expect, test } from 'vitest'
import { fakeUsers } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { workspaceActionIds, type WorkspacePage } from './page-actions'

const [cal, priya] = fakeUsers
const workspace = {
  ...workspaceFixtures().workspaces.workspaces[0],
  owner: cal,
}

const goTo = [
  'go-to-all-files',
  'go-to-changes',
  'go-to-checks',
  'go-to-terminal',
  'go-to-preview',
  'go-to-desktop',
]

describe('the actions of an open workspace', () => {
  test('follow the role, the suspension, the archive, and what the page shows', () => {
    const ids = (overrides: Partial<WorkspacePage>) =>
      workspaceActionIds({
        access: { role: 'member', suspended: false },
        workspace,
        viewer: cal,
        rightColumn: true,
        chat: true,
        ...overrides,
      })
    expect({
      owner: ids({}),
      otherMember: ids({ viewer: priya }),
      admin: ids({
        access: { role: 'admin', suspended: false },
        viewer: priya,
      }),
      phoneChat: ids({ rightColumn: false }),
      phoneTool: ids({ rightColumn: false, chat: false }),
      suspended: ids({ access: { role: 'admin', suspended: true } }),
      archived: ids({ workspace: { ...workspace, state: 'archived' } }),
    }).toEqual({
      owner: ['new-session', 'session-history', ...goTo, 'archive-workspace'],
      otherMember: ['new-session', 'session-history', ...goTo],
      admin: ['new-session', 'session-history', ...goTo, 'archive-workspace'],
      phoneChat: ['new-session', 'session-history', 'archive-workspace'],
      phoneTool: ['archive-workspace'],
      suspended: ['session-history', ...goTo],
      archived: ['session-history'],
    })
  })
})
