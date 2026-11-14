import { afterEach, beforeAll } from 'vitest'

import {
  attachmentUploadCompletePath,
  attachmentUploadPartPath,
  attachmentUploadStartPath,
  type AttachmentUploadPart,
  type AttachmentUploadTarget,
} from '../../../src/shared/messages'
import { readAttachment } from '../attachment-data'
import { counter, identifier, record } from '../inputs'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'

export const WORKSPACE_TARGET: AttachmentUploadTarget = {
  type: 'workspace',
  workspaceId: OUTER_WORKSPACE,
}
export const DRAFT_TARGET: AttachmentUploadTarget = {
  type: 'new-workspace',
  messageId: 'multipart-first-message',
}

export function multipartFixture() {
  let bundle: string
  let active: OuterRuntime | undefined
  beforeAll(async () => {
    bundle = await outerWorkerBundle(
      'worker/chat/integration/attachment-entry.test-support.ts',
    )
  })
  afterEach(async () => {
    await active?.dispose()
    active = undefined
  })
  return async () => (active = await createOuterRuntime(bundle))
}

export function startUpload(
  fixture: OuterRuntime,
  sizeBytes: number,
  target = WORKSPACE_TARGET,
  extra: Record<string, unknown> = {},
) {
  return fixture.request(attachmentUploadStartPath(OUTER_ORG, target), {
    method: 'POST',
    body: JSON.stringify({
      name: 'multipart file.bin',
      mediaType: 'application/octet-stream',
      sizeBytes,
      ...(target.type === 'new-workspace'
        ? { messageId: target.messageId }
        : {}),
      ...extra,
    }),
  })
}

export async function startedUpload(
  fixture: OuterRuntime,
  sizeBytes: number,
  target = WORKSPACE_TARGET,
) {
  const response = await startUpload(fixture, sizeBytes, target)
  if (response.status !== 201)
    throw new Error(`Start failed: ${response.status} ${await response.text()}`)
  const body = record(await response.json())
  return identifier(body.uploadId)
}

export function sendPart(
  fixture: OuterRuntime,
  uploadId: string,
  partNumber: number,
  bytes: Uint8Array,
  options: {
    target?: AttachmentUploadTarget
    headers?: HeadersInit
    query?: string
  } = {},
) {
  const path = attachmentUploadPartPath(
    OUTER_ORG,
    options.target ?? WORKSPACE_TARGET,
    uploadId,
    partNumber,
  )
  const headers = new Headers({
    Cookie: fixture.cookies.ownerCookie,
    Origin: fixture.env.APP_ORIGIN,
    'Content-Type': 'application/octet-stream',
    'Content-Length': String(bytes.byteLength),
  })
  new Headers(options.headers).forEach((value, name) =>
    headers.set(name, value),
  )
  return fixture.runtime.dispatchFetch(
    `${fixture.env.APP_ORIGIN}${path}${options.query ?? ''}`,
    { method: 'PUT', headers: [...headers], body: bytes },
  )
}

export async function partReceipt(response: { json(): Promise<unknown> }) {
  const body = record(await response.json())
  return { partNumber: counter(body.partNumber), etag: identifier(body.etag) }
}

export function completeUpload(
  fixture: OuterRuntime,
  uploadId: string,
  parts: readonly AttachmentUploadPart[],
  target = WORKSPACE_TARGET,
  headers?: HeadersInit,
) {
  return fixture.request(
    attachmentUploadCompletePath(OUTER_ORG, target, uploadId),
    { method: 'POST', body: JSON.stringify({ parts }), headers },
  )
}

export async function uploadRecord(fixture: OuterRuntime, uploadId: string) {
  const result = await readAttachment(fixture.env.DB, uploadId)
  if (!result) throw new Error('The upload record is missing.')
  return result
}
