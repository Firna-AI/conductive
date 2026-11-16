import type { AttachmentUploadTarget } from '../../src/shared/messages'
import { sessionPaths } from '../../src/shared/sessions'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { readAttachment } from './attachment-data'
import { uploadAttachment } from '../test-support/attachment-upload'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'
import type { ChatFixtureOptions } from './harness.test-support'
import type { RepositoryLocation } from '../lifecycle/repository-locations'

export const ATTACHMENT_REPOSITORY_DIRECTORY = '/home/user/code/attachment-repo'
export const ATTACHMENT_IGNORE_BYTES = new Uint8Array([42])
export const FILE_BYTES = new Uint8Array([0, 255, 128, 13, 10, 65])

export function attachmentRepositoryLocations(
  directory = ATTACHMENT_REPOSITORY_DIRECTORY,
): readonly RepositoryLocation[] {
  return [
    {
      repositoryId: 'another-repo',
      directory: '/home/user/code/another-repo',
      variable: 'CONDUCTIVE_REPOSITORY_ANOTHER_REPO_DIR',
    },
    {
      repositoryId: 'repo',
      directory,
      variable: 'CONDUCTIVE_REPOSITORY_ATTACHMENT_REPO_DIR',
    },
  ]
}

export async function attachmentFixture(
  harness: TestHarness,
  options: ChatFixtureOptions & { captureRepository?: boolean } = {},
) {
  const { captureRepository = true, ...overrides } = options
  const chat = await createChatFixture(harness, {
    prepareAttachments: async () => null,
    ...overrides,
  })
  if (captureRepository)
    await harness.env.DB.prepare(
      `INSERT INTO workspace_runtime
      (workspace_id, org_id, created_by_user_id, session_id, first_turn_id,
       agent, model, effort, first_message_id, repository_locations_json)
      VALUES (?, ?, ?, 'fixture-session', 'fixture-turn', ?, ?, ?, 'fixture-first', ?)`,
    )
      .bind(
        WORKSPACE_ID,
        chat.org.id,
        chat.owner.id,
        CLAUDE.agent,
        CLAUDE.model,
        CLAUDE.effort,
        JSON.stringify(attachmentRepositoryLocations()),
      )
      .run()
  const target: AttachmentUploadTarget = {
    type: 'workspace',
    workspaceId: WORKSPACE_ID,
  }
  let sequence = 0
  const upload = (
    source: Uint8Array = FILE_BYTES,
    uploadTarget: AttachmentUploadTarget = target,
  ) =>
    uploadAttachment(
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
  return {
    ...chat,
    target,
    upload,
    bytes,
    sendAttachment: send,
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
