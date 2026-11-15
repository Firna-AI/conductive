import { expect, it } from 'vitest'

import { readUserMessage } from '../../chat/api/read-chat'
import { readWorkspaceResponse as readChatWorkspace } from '../../chat/api/read-workspace'
import { parseWorkspace } from '../../members/api/parseCore'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { readAttachment, readCreated, readWorkspace } from './read-workspaces'

const attachment = {
  id: 'image',
  name: 'Login screen.png',
  path: '.context/attachments/image/Login-screen.png',
  kind: 'image',
  mediaType: 'image/png',
  sizeBytes: 25,
}

it('reads upload and sent paths and gives old stored files a null path', () => {
  const { created } = workspaceFixtures()
  for (const path of [attachment.path, null, undefined]) {
    const file = { ...attachment, path }
    const message = { ...created.firstMessage, attachments: [file] }
    expect(readAttachment(file)).toEqual({ ...file, path: path ?? null })
    expect(readUserMessage(message).attachments).toEqual([
      { ...file, path: path ?? null },
    ])
    expect(
      readCreated({ ...created, firstMessage: message }).firstMessage
        .attachments,
    ).toEqual([{ ...file, path: path ?? null }])
  }
})

it('preserves each GitHub summary in shell, chat, and member workspace records', () => {
  const { detail } = workspaceFixtures()
  for (const github of [
    'checks-running',
    'checks-failed',
    'ready-to-merge',
    'merged',
    'conflict',
    'changes-requested',
    'draft',
    'blocked',
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
