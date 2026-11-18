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

it('preserves the parent and each GitHub summary in shell, chat, and member workspace records', () => {
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
    const workspace = { ...detail.workspace, parentId: 'parent', github }
    expect(readWorkspace(workspace).github).toBe(github)
    expect(readWorkspace(workspace).parentId).toBe('parent')
    expect(readChatWorkspace({ ...detail, workspace }).workspace.github).toBe(
      github,
    )
    expect(readChatWorkspace({ ...detail, workspace }).workspace.parentId).toBe(
      'parent',
    )
    expect(parseWorkspace(workspace).github).toBe(github)
    expect(parseWorkspace(workspace).parentId).toBe('parent')
  }
})

it('reads older shell, chat, and member replies without a GitHub summary or a parent as null', () => {
  const { detail } = workspaceFixtures()
  const workspace = { ...detail.workspace }
  Reflect.deleteProperty(workspace, 'github')
  Reflect.deleteProperty(workspace, 'parentId')
  expect(readWorkspace(workspace).github).toBeNull()
  expect(readWorkspace(workspace).parentId).toBeNull()
  const chat = readChatWorkspace({ ...detail, workspace }).workspace
  expect(chat.github).toBeNull()
  expect(chat.parentId).toBeNull()
  expect(parseWorkspace(workspace).github).toBeNull()
  expect(parseWorkspace(workspace).parentId).toBeNull()
})
