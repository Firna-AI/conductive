import { expect, it } from 'vitest'

import { readWorkspaceResponse as readChatWorkspace } from '../../chat/api/read-workspace'
import { parseWorkspace } from '../../members/api/parseCore'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { readWorkspace } from './read-workspaces'

it('preserves each GitHub summary in shell, chat, and member workspace records', () => {
  const { detail } = workspaceFixtures()
  for (const github of [
    'checks-running',
    'checks-failed',
    'checks-passed',
    'merged',
    null,
  ]) {
    const workspace = { ...detail.workspace, github }
    expect(readWorkspace(workspace).github).toBe(github)
    expect(readChatWorkspace({ ...detail, workspace }).workspace.github).toBe(
      github,
    )
    expect(parseWorkspace(workspace).github).toBe(github)
  }
})

it('reads older shell, chat, and member replies without a GitHub summary as null', () => {
  const { detail } = workspaceFixtures()
  const workspace = { ...detail.workspace }
  Reflect.deleteProperty(workspace, 'github')
  expect(readWorkspace(workspace).github).toBeNull()
  expect(
    readChatWorkspace({ ...detail, workspace }).workspace.github,
  ).toBeNull()
  expect(parseWorkspace(workspace).github).toBeNull()
})
