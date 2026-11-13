import { attachmentCommandTransfer } from '../test-support/attachment-command'
import { handleAttachmentDownload } from './attachment-download'
import type { TestHarness } from '../test-support/harness'
import { prepareMessageAttachments } from './attachment-copy'
import { attachmentFixture, held } from './attachment.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import type { ChatDependencies } from './types'

export const AGENT_BYTES = new Uint8Array([65, 103, 101, 110, 116])

export function selectAttachmentComputer(harness: TestHarness, id: string) {
  return harness.env.DB.prepare(
    'UPDATE workspaces SET sandbox_id = ? WHERE id = ?',
  )
    .bind(id, WORKSPACE_ID)
    .run()
}

export function attachmentOwnerCopy(harness: TestHarness, failFirst = false) {
  const entered = held<void>()
  const release = held<void>()
  const files = new Map<string, Uint8Array>()
  const delivered = new Set<string>()
  const writes: { sandboxId: string; path: string }[] = []
  const requests: Request[] = []
  const work: Promise<string | null>[] = []
  let maximumWriters = 0
  let lateWrites = 0
  let active = 0
  const fileKey = (sandboxId: string, path: string) =>
    JSON.stringify([sandboxId, path])
  const transfer = attachmentCommandTransfer({
    before: async (sandboxId, path) => {
      const index = writes.push({ sandboxId, path }) - 1
      maximumWriters = Math.max(maximumWriters, ++active)
      if (index === 0) {
        entered.resolve()
        await release.promise
      }
      active--
    },
    fail: () => failFirst && writes.length === 1,
    download: (request) => handleAttachmentDownload(request, harness.env),
    copied: (sandboxId, path, bytes) => {
      const key = fileKey(sandboxId, path)
      if (delivered.has(key)) lateWrites++
      files.set(key, bytes)
    },
  })
  const fetch = async (request: Request) => {
    requests.push(request)
    const response = await transfer.fetch(request)
    if (!response) throw new Error('Unexpected provider request')
    return response
  }
  const prepare: ChatDependencies['prepareAttachments'] = (...args) => {
    const copying = prepareMessageAttachments(harness.env, ...args, fetch)
    work.push(copying)
    return copying
  }
  return {
    dependencies: { prepareAttachments: prepare },
    prepare,
    entered,
    release,
    writes,
    requests,
    settleCopies: () => Promise.allSettled(work),
    settleReplacements: () => Promise.allSettled(work.slice(1)),
    edit: (sandboxId: string, path: string) => {
      const key = fileKey(sandboxId, path)
      delivered.add(key)
      files.set(key, AGENT_BYTES)
    },
    read: (sandboxId: string, path: string) =>
      files.get(fileKey(sandboxId, path)),
    get maximumWriters() {
      return maximumWriters
    },
    get lateWrites() {
      return lateWrites
    },
  }
}

export async function attachmentOwnerFixture(
  harness: TestHarness,
  failFirst = false,
) {
  const copy = attachmentOwnerCopy(harness, failFirst)
  const fixture = await attachmentFixture(harness, copy.dependencies)
  await selectAttachmentComputer(harness, 'sandbox-owner')
  const file = await fixture.upload()
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  return { copy, fixture, file, session, runner }
}
