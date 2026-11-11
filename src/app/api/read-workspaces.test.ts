import { expect, it } from 'vitest'
import { readUserMessage } from '../../chat/api/read-chat'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { readAttachment, readCreated } from './read-workspaces'

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
