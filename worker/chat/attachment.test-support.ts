import type { AttachmentUploadTarget } from '../../src/shared/messages'
import { sessionPaths } from '../../src/shared/sessions'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { readAttachment } from './attachment-data'
import { storeAttachment } from './attachment-storage'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'
import type { ChatDependencies } from './types'

export const FILE_BYTES = new Uint8Array([0, 255, 128, 13, 10, 65])

export async function attachmentFixture(
  harness: TestHarness,
  overrides: Partial<ChatDependencies> = {},
) {
  const background: Promise<unknown>[] = []
  const chat = await createChatFixture(harness, {
    prepareAttachments: async () => null,
    ...overrides,
    waitUntil: (work) => {
      background.push(work)
      overrides.waitUntil?.(work)
    },
  })
  const target: AttachmentUploadTarget = {
    type: 'workspace',
    workspaceId: WORKSPACE_ID,
  }
  let sequence = 0
  const upload = (
    source: Uint8Array | ReadableStream<Uint8Array> = FILE_BYTES,
    uploadTarget: AttachmentUploadTarget = target,
  ) =>
    storeAttachment(
      harness.env,
      {
        orgId: chat.org.id,
        uploaderUserId: chat.owner.id,
        target: uploadTarget,
        name: 'binary.dat',
        kind: 'file',
        mediaType: 'application/octet-stream',
      },
      source,
      { now: () => TEST_TIME, newId: () => `stored-file-${++sequence}` },
    )
  const bytes = async (id: string) => {
    const record = await readAttachment(harness.env.DB, id)
    if (!record) throw new Error('The attachment record is missing.')
    const object = await harness.env.CHAT_ATTACHMENTS?.get(record.objectKey)
    if (!object) throw new Error('The attachment object is missing.')
    return new Uint8Array(await object.arrayBuffer())
  }
  const send = (
    sessionId: string,
    messageId: string,
    attachmentIds: readonly string[],
    cookie = chat.ownerCookie,
  ) =>
    chat.fetch(
      sessionPaths.messages(chat.org.id, WORKSPACE_ID, sessionId),
      {
        id: messageId,
        text: 'Read the file',
        choice: CLAUDE,
        attachmentIds,
      },
      cookie,
    )
  let index = 0
  const drainAttachments = async () => {
    while (index < background.length) await background[index++]
    await chat.drain()
  }
  return {
    ...chat,
    target,
    upload,
    bytes,
    sendAttachment: send,
    drainAttachments,
  }
}

export function held<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error('The promise is not initialized.')
  }
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
