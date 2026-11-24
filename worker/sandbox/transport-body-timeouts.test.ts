import { afterEach, expect, it, vi } from 'vitest'

import { attachmentDownloadProcess } from '../chat/attachment-download-process'
import { retryUnanswered } from '../chat/attachment-transfer-failure'
import { providerChannel } from '../machines/provider-channel'
import { FakeBoat } from '../test-support/fake-boat'
import { BoatClient } from './boat'
import { BoatTransport } from './transport'
import {
  advanceBodyDeadline,
  deferred,
  fakeProviderTimers,
  outcome,
  stalledReply,
  type StalledReply,
} from './body-timeout.test-support'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('reports successful Boat bodies that miss their route deadline as unavailable and preserves HTTP errors', async () => {
  fakeProviderTimers()
  const scenarios = [
    {
      route: { operation: 'startCommand', sandboxId: 'bx_one' },
      deadline: 30_000,
      status: 200,
      kind: 'unavailable',
      errorStatus: 503,
    },
    {
      route: {
        operation: 'readFile',
        sandboxId: 'bx_one',
        path: '/file',
        maxBytes: 10,
      },
      deadline: 65_000,
      status: 200,
      kind: 'unavailable',
      errorStatus: 503,
    },
    {
      route: { operation: 'command', sandboxId: 'bx_one' },
      deadline: 610_000,
      status: 200,
      kind: 'unavailable',
      errorStatus: 503,
    },
    {
      route: { operation: 'fileInfo', sandboxId: 'bx_one', path: '/file' },
      deadline: 30_000,
      status: 404,
      kind: 'not_found',
      errorStatus: 404,
    },
    {
      route: { operation: 'get', sandboxId: 'bx_one' },
      deadline: 30_000,
      status: 503,
      kind: 'unavailable',
      errorStatus: 503,
    },
  ] as const
  for (const scenario of scenarios) {
    const opened = deferred<StalledReply>()
    const transport = new BoatTransport(
      'boat-first',
      async (request) => {
        const reply = stalledReply(request, scenario.status)
        opened.resolve(reply)
        return reply.response
      },
      'app-org',
    )
    const pending = outcome(transport.request(scenario.route))
    await advanceBodyDeadline(
      await opened.promise,
      pending.settled,
      scenario.deadline,
    )
    expect(await pending.result).toMatchObject({
      error: { kind: scenario.kind, status: scenario.errorStatus },
    })
  }
})

it.each([1, 2])(
  'retries a Boat attachment body deadline only once after %i unanswered starts',
  async (failures) => {
    fakeProviderTimers()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const server = new FakeBoat()
    const stalled = Array.from({ length: failures }, () =>
      deferred<StalledReply>(),
    )
    server.responseFactories = stalled.map((opened) => (request) => {
      const reply = stalledReply(request)
      opened.resolve(reply)
      return reply.response
    })
    server.responseFactories.push(
      () =>
        Response.json({
          ok: true,
          type: 'command.started',
          success: true,
          processId: 7,
        }),
      () =>
        Response.json({
          ok: true,
          type: 'command.status',
          success: true,
          processId: 7,
          status: 'exited',
          running: false,
          exitCode: 0,
          timedOut: false,
          stdout: '',
          stderr: '',
          stdoutOffset: 0,
          stderrOffset: 0,
          stdoutNextOffset: 0,
          stderrNextOffset: 0,
          more: false,
        }),
    )
    const client = new BoatClient('boat-first', server.fetch, 'app-org')
    const run = vi.fn(
      attachmentDownloadProcess(
        providerChannel(client, 'bx_one'),
        () => 'download',
      ),
    )
    const pending = outcome(retryUnanswered('workspace', run))
    for (const [index, opened] of stalled.entries()) {
      expect(run).toHaveBeenCalledTimes(index + 1)
      await advanceBodyDeadline(await opened.promise, pending.settled, 30_000)
    }
    expect(await pending.result).toMatchObject(
      failures === 1
        ? { value: undefined }
        : {
            error: {
              step: 'start',
              unanswered: true,
              failure: { kind: 'unavailable', status: 503 },
            },
          },
    )
    expect(run).toHaveBeenCalledTimes(2)
    expect(server.requests).toHaveLength(failures === 1 ? 3 : 2)
    expect(warn.mock.calls.map(([warning]: unknown[]) => warning)).toEqual([
      expect.objectContaining({
        kind: 'attachment_transfer_retried',
        step: 'start',
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
