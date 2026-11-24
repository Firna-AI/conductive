import { afterEach, expect, it, vi } from 'vitest'

import { attachmentDownloadProcess } from '../../chat/attachment-download-process'
import {
  AttachmentTransferFailed,
  retryUnanswered,
} from '../../chat/attachment-transfer-failure'
import { providerChannel } from '../../machines/provider-channel'
import { fakeE2bJobPath } from '../../test-support/fake-e2b-envd'
import {
  advanceBodyDeadline,
  deferred,
  fakeProviderTimers,
  outcome,
  stalledReply,
  type StalledReply,
} from '../body-timeout.test-support'
import { E2bClient } from './client'
import { e2bFixture } from './client.test-support'
import { controlRoute } from './routes'
import { envdRoute } from './envd-routes'

const fixture = e2bFixture()
const sandboxId = 'sandbox-one'
const path = '/home/user/file'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function stalledClient(target: string) {
  const { server, options } = fixture()
  server.sandboxes.set(sandboxId, {
    sandboxID: sandboxId,
    state: 'running',
    metadata: {},
  })
  server.envd.files.set(path, new Uint8Array([1, 2, 3]))
  const opened = deferred<StalledReply>()
  let requests = 0
  const client = new E2bClient({
    ...options,
    fetch: async (request) => {
      const response = await server.fetch(request)
      const url = new URL(request.url)
      if (url.pathname + url.search !== target || ++requests !== 1)
        return response
      const reply = stalledReply(request, response.status, response.headers)
      opened.resolve(reply)
      return reply.response
    },
  })
  return { client, server, opened: opened.promise, requests: () => requests }
}

it.each([
  {
    phase: 'control lookup',
    target: controlRoute({ operation: 'get', sandboxId }).path,
    deadline: 30_000,
  },
  {
    phase: 'file stat',
    target: envdRoute({ operation: 'stat', path }, 'user').path,
    deadline: 65_000,
  },
])(
  'retries an attachment check after a body deadline in $phase',
  async ({ target, deadline }) => {
    const { client, opened, requests } = stalledClient(target)
    fakeProviderTimers()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const check = vi.fn(async () => {
      try {
        return await client.fileInfo(sandboxId, path)
      } catch (error) {
        throw new AttachmentTransferFailed('check', error)
      }
    })
    const pending = outcome(retryUnanswered('workspace', check))
    await advanceBodyDeadline(await opened, pending.settled, deadline)
    expect(await pending.result).toEqual({
      value: { path, sizeBytes: 3, isDirectory: false },
    })
    expect(check).toHaveBeenCalledTimes(2)
    expect(requests()).toBe(2)
    expect(warn.mock.calls.map(([warning]: unknown[]) => warning)).toEqual([
      expect.objectContaining({
        kind: 'attachment_transfer_retried',
        step: 'check',
        error: {
          kind: 'provider',
          providerKind: 'unavailable',
          status: 503,
          code: null,
        },
      }),
    ])
  },
)

it.each(['meta.json', 'stdout'])(
  'retries an attachment download after the envd status %s body times out',
  async (name) => {
    const target = envdRoute(
      { operation: 'read', path: fakeE2bJobPath(1234, name) },
      'root',
    ).path
    const { client, opened, requests } = stalledClient(target)
    fakeProviderTimers()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const download = vi.fn(
      attachmentDownloadProcess(
        providerChannel(client, sandboxId),
        () => 'download',
      ),
    )
    const pending = outcome(retryUnanswered('workspace', download))
    await advanceBodyDeadline(await opened, pending.settled, 65_000)
    expect(await pending.result, name).toEqual({ value: undefined })
    expect(download, name).toHaveBeenCalledTimes(2)
    expect(requests(), name).toBe(2)
    expect(
      warn.mock.calls.map(([warning]: unknown[]) => warning),
      name,
    ).toEqual([
      expect.objectContaining({
        kind: 'attachment_transfer_retried',
        step: 'status',
        error: {
          kind: 'provider',
          providerKind: 'unavailable',
          status: 503,
          code: null,
        },
      }),
    ])
  },
)
