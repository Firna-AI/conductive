import { describe, expect, test } from 'vitest'
import { fakeUsers } from '../test-support/fixtures/core'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { mayArchive } from './permissions'

const [cal, priya] = fakeUsers
const workspace = {
  ...workspaceFixtures().workspaces.workspaces[0],
  owner: priya,
}

describe('mayArchive', () => {
  test('the owner and the admins archive a workspace, another member does not', () => {
    expect([
      mayArchive({ role: 'member' }, workspace, priya),
      mayArchive({ role: 'admin' }, workspace, cal),
      mayArchive({ role: 'member' }, workspace, cal),
      mayArchive({ role: 'admin' }, { ...workspace, state: 'archived' }, cal),
    ]).toEqual([true, true, false, false])
  })
})
