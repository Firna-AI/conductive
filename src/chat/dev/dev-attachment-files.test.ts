import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  copyPath,
  expectCopiedFile,
  imageFile,
  resetDevWindow,
  setupDevWindow,
  uploadHooks,
} from '../../app/dev/attachment-test-kit'
import { createFilesClient } from '../../files/api/files-client'
import { mentionText } from '../../shared/mention-text'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { createChatApi } from '../api/client'
import { DevBackend } from './dev-backend'
import { readOptions } from './dev-options'

const backends = new Set<DevBackend>()

beforeEach(setupDevWindow)
afterEach(() => {
  for (const backend of backends) backend.dispose()
  backends.clear()
  resetDevWindow()
})

async function clients(search = '') {
  const backend = await DevBackend.create(readOptions(search), {
    now: () => FAKE_TIME,
  })
  backends.add(backend)
  return {
    chat: createChatApi(backend.client, backend.target),
    files: createFilesClient({ fetch: backend.fetch, ...backend.target }),
  }
}

it('reads the real uploaded bytes after a chat send without adding copied files to either list', async () => {
  const { chat, files } = await clients()
  const tree = await files.readTree()
  const changes = await files.readChanges()
  const original = imageFile()
  const attachment = await chat.upload(original, uploadHooks())
  const path = copyPath(attachment)
  const session = (await chat.sessions()).sessions[0]
  const sent = await chat.send(session.id, {
    id: 'uploaded-chat-message',
    text: mentionText(path, false),
    attachmentIds: [attachment.id],
    choice: session.choice,
  })
  expect(sent.message.attachments).toEqual([attachment])
  expect(sent.message.state).toBe('sent')
  await expectCopiedFile(await files.readFile(path), original, path)
  expect(await files.readTree()).toEqual(tree)
  expect(await files.readChanges()).toEqual(changes)
})

it('copies a queued chat upload only when Resume gives its message to the agent', async () => {
  const { chat, files } = await clients('?state=stopped')
  const original = new File(['Bytes waiting for Resume.\r\n'], 'waiting.txt', {
    type: 'text/plain',
  })
  const attachment = await chat.upload(original, uploadHooks())
  const path = copyPath(attachment)
  const session = (await chat.sessions()).sessions[0]
  const sent = await chat.send(session.id, {
    id: 'queued-chat-file',
    text: mentionText(path, false),
    attachmentIds: [attachment.id],
    choice: session.choice,
  })
  expect(sent.message.state).toBe('queued')
  expect(await files.readFile(path)).toEqual({
    ok: false,
    error: { kind: 'not-found' },
  })
  await chat.resume()
  await vi.runAllTimersAsync()
  await expectCopiedFile(await files.readFile(path), original, path)
})
