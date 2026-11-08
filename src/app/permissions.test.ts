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
  test('the owner and the admins archive a workspace, another member does not, and nobody archives in a suspended org', () => {
    const active = false
    expect([
      mayArchive({ role: 'member', suspended: active }, workspace, priya),
      mayArchive({ role: 'admin', suspended: active }, workspace, cal),
      mayArchive({ role: 'member', suspended: active }, workspace, cal),
      mayArchive(
        { role: 'admin', suspended: active },
        { ...workspace, state: 'archived' },
        cal,
      ),
      mayArchive({ role: 'admin', suspended: true }, workspace, cal),
      mayArchive({ role: 'member', suspended: true }, workspace, priya),
    ]).toEqual([true, true, false, false, false, false])
  })
})
