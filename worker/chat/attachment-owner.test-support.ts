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
  const active = new Map<string, number>()
  const work: Promise<string | null>[] = []
  let maximumWriters = 0
  let lateWrites = 0
  const fileKey = (sandboxId: string, path: string) =>
    JSON.stringify([sandboxId, path])
  const fetch = async (request: Request) => {
    const url = new URL(request.url)
    if (url.hostname === 'boat.dev') {
      requests.push(request)
      const body: { path: string } = await request.json()
      const sandboxId = url.pathname.split('/').at(-3)
      if (!sandboxId) throw new Error('The destination computer is missing.')
      const index = writes.push({ sandboxId, path: body.path }) - 1
      return Response.json({
        ok: true,
        type: 'file.upload_url',
        method: 'PUT',
        path: body.path,
        url: `https://attachment-owner.test/${index}`,
        expiresAt: '2099-01-01T00:00:00Z',
      })
    }
    const index = Number(url.pathname.slice(1))
    const write = writes[index]
    if (!write) throw new Error('The transfer grant is missing.')
    const key = fileKey(write.sandboxId, write.path)
    const count = (active.get(key) ?? 0) + 1
    active.set(key, count)
    maximumWriters = Math.max(maximumWriters, count)
    try {
      if (index === 0) {
        entered.resolve()
        await release.promise
      }
      const bytes = new Uint8Array(await request.arrayBuffer())
      if (index === 0 && failFirst) return new Response(null, { status: 503 })
      if (delivered.has(key)) lateWrites++
      files.set(key, bytes)
      return new Response(null, { status: 204 })
    } finally {
      active.set(key, count - 1)
    }
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
