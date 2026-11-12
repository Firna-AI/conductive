import { afterEach, beforeEach, expect, it } from 'vitest'
import { createChatApi } from '../../chat/api/client'
import { createFilesClient } from '../../files/api/files-client'
import { attachmentPath } from '../../shared/attachment-paths'
import { FILE_READ_MAX_BYTES } from '../../shared/files'
import { mentionText } from '../../shared/mention-text'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { FAKE_FILE_PATH } from '../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  copyPath,
  expectCopiedFile,
  imageFile,
  resetDevWindow,
  setupDevWindow,
  uploadHooks,
} from './attachment-test-kit'
import { createFakeServices } from './fake-services'

const target = { orgId: FAKE_IDS.org, workspaceId: FAKE_IDS.workspace }

beforeEach(setupDevWindow)
afterEach(resetDevWindow)

function clients(search = '') {
  const { api } = createFakeServices(search)
  return {
    api,
    chat: createChatApi(api, target),
    files: createFilesClient({ fetch: api.fetch, ...target }),
  }
}

it('reads the uploaded image and text at sent paths without changing All files or Changes', async () => {
  const { api, chat, files } = clients()
  const tree = await files.readTree()
  const changes = await files.readChanges()
  const seeded = await files.readFile(FAKE_FILE_PATH)
  const originals = [
    imageFile(),
    new File(['\uFEFFActual uploaded bytes: café\r\n'], 'notes.txt', {
      type: 'text/plain',
    }),
  ]
  const attachments = []
  for (const file of originals) {
    attachments.push(await chat.upload(file, uploadHooks()))
  }
  const session = (await chat.sessions()).sessions[0]
  const text = attachments
    .map((file) => mentionText(copyPath(file), false))
    .join(' ')
  const sent = await chat.send(session.id, {
    id: 'uploaded-app-message',
    text,
    attachmentIds: attachments.map(({ id }) => id),
    choice: session.choice,
  })
  expect(sent.message).toMatchObject({
    id: 'uploaded-app-message',
    text,
    attachments,
    state: 'sent',
  })
  for (const [index, attachment] of attachments.entries()) {
    const path = copyPath(attachment)
    await expectCopiedFile(await files.readFile(path), originals[index], path)
    const downloaded = await api.fetch(files.downloadHref(path))
    expect(downloaded.status).toBe(200)
    expect(new Uint8Array(await downloaded.arrayBuffer())).toEqual(
      new Uint8Array(await originals[index].arrayBuffer()),
    )
  }
  expect(await files.readTree()).toEqual(tree)
  expect(await files.readChanges()).toEqual(changes)
  expect(await files.readFile(FAKE_FILE_PATH)).toEqual(seeded)
  const other = workspaceFixtures().workspaces.workspaces.find(
    ({ id }) => id !== target.workspaceId,
  )
  if (!other) throw new Error('The second workspace fixture is missing.')
  const otherFiles = createFilesClient({
    fetch: api.fetch,
    orgId: target.orgId,
    workspaceId: other.id,
  })
  expect(await otherFiles.readFile(copyPath(attachments[0]))).toEqual({
    ok: false,
    error: { kind: 'not-found' },
  })
})

it('keeps copied reads and downloads within the file read limit and reports missing copies', async () => {
  const { api, chat, files } = clients()
  const session = (await chat.sessions()).sessions[0]
  const atLimit = new File(
    [new Uint8Array(FILE_READ_MAX_BYTES).fill(97)],
    'limit.bin',
    { type: 'application/octet-stream' },
  )
  const overLimit = new File(
    [new Uint8Array(FILE_READ_MAX_BYTES + 1)],
    'large.bin',
    { type: 'application/octet-stream' },
  )
  const attachment = await chat.upload(atLimit, uploadHooks())
  const large = await chat.upload(overLimit, uploadHooks())
  await chat.send(session.id, {
    id: 'app-read-limits',
    text: 'Read these files.',
    attachmentIds: [attachment.id, large.id],
    choice: session.choice,
  })
  const path = copyPath(attachment)
  await expectCopiedFile(await files.readFile(path), atLimit, path)
  const error = {
    ok: false,
    error: { kind: 'too-large', sizeBytes: 5_242_881, limitBytes: 5_242_880 },
  }
  expect(await files.readFile(copyPath(large))).toEqual(error)
  const download = await api.fetch(files.downloadHref(copyPath(large)))
  expect(download.status).toBe(413)
  expect(await download.json()).toMatchObject({
    error: {
      code: 'file_too_large',
      sizeBytes: 5_242_881,
      limitBytes: 5_242_880,
    },
  })
  const missing = await attachmentPath({
    id: 'not-uploaded',
    name: 'missing.txt',
  })
  expect(await files.readFile(missing)).toEqual({
    ok: false,
    error: { kind: 'not-found' },
  })
  expect((await api.fetch(files.downloadHref(missing))).status).toBe(404)
})

it('keeps an app attachment queued and unreadable while its workspace is stopped', async () => {
  const { chat, files } = clients('?workspace=stopped')
  const attachment = await chat.upload(
    new File(['not copied yet'], 'waiting.txt', { type: 'text/plain' }),
    uploadHooks(),
  )
  const session = (await chat.sessions()).sessions[0]
  const sent = await chat.send(session.id, {
    id: 'queued-app-file',
    text: mentionText(copyPath(attachment), false),
    attachmentIds: [attachment.id],
    choice: session.choice,
  })
  expect(sent.message.state).toBe('queued')
  expect(sent.turnId).toBeNull()
  expect(await files.readFile(copyPath(attachment))).toEqual({
    ok: false,
    error: { kind: 'not-found' },
  })
})
