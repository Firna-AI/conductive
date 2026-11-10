import { expect, it } from 'vitest'

import { attachmentPath, type AttachmentRecord } from './attachment-record'

const record: AttachmentRecord = {
  id: 'attached-file',
  orgId: 'org',
  uploaderUserId: 'member',
  targetKind: 'workspace',
  targetId: 'workspace',
  name: '',
  kind: 'file',
  mediaType: 'application/octet-stream',
  sizeBytes: 1,
  objectKey: 'object',
  multipartId: null,
  state: 'claimed',
  createdAt: 0,
  expiresAt: 1,
  claimedWorkspaceId: 'workspace',
  claimedMessageId: 'message',
  revision: 1,
}

it.each([
  ['Project plan.PDF', 'Project-plan.pdf'],
  ['仕様書.txt', '-.txt'],
  [
    'a'.repeat(110) + '.PNG',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png',
  ],
  ['.PNG', 'file.png'],
  ['', 'file'],
  ['..', 'file'],
  ['...', 'file'],
])('builds a safe relative attachment path for %j', async (name, safeName) => {
  expect(await attachmentPath({ ...record, name }, 'message')).toBe(
    `.context/attachments/588300034e3fdd57e72b1708d196cd33/${safeName}`,
  )
})
