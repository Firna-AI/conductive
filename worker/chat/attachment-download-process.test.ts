import { expect, it, vi } from 'vitest'
import { ProviderError } from '../sandbox/errors'
import type { CommandStatus } from '../sandbox/provider'
import { runAttachmentDownload } from './attachment-download-process'

function status(change: Partial<CommandStatus> = {}): CommandStatus {
  return {
    processId: 7,
    state: 'exited',
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
    ...change,
  }
}

it('starts a detached download and polls its next byte offsets until the process exits with all output read', async () => {
  const provider = {
    startCommand: vi.fn(async () => ({ processId: 7 })),
    getCommandStatus: vi
      .fn()
      .mockResolvedValueOnce(
        status({
          state: 'running',
          running: true,
          exitCode: null,
          stdoutNextOffset: 5,
          stderrNextOffset: 3,
        }),
      )
      .mockResolvedValueOnce(
        status({
          more: true,
          stdoutOffset: 5,
          stderrOffset: 3,
          stdoutNextOffset: 10,
          stderrNextOffset: 6,
        }),
      )
      .mockResolvedValueOnce(
        status({
          stdoutOffset: 10,
          stderrOffset: 6,
          stdoutNextOffset: 10,
          stderrNextOffset: 6,
        }),
      ),
  }
  const wait = vi.fn<(ms: number) => Promise<void>>(async () => {})
  await runAttachmentDownload(provider, 'sandbox', 'download command', wait)
  expect(provider.startCommand.mock.calls).toEqual([
    ['sandbox', 'download command'],
  ])
  expect(provider.getCommandStatus.mock.calls).toEqual([
    ['sandbox', 7, { stdoutOffset: 0, stderrOffset: 0 }],
    ['sandbox', 7, { stdoutOffset: 5, stderrOffset: 3 }],
    ['sandbox', 7, { stdoutOffset: 10, stderrOffset: 6 }],
  ])
  expect(wait.mock.calls).toEqual([[100], [200]])
})

it('fails a nonzero, timed-out, or lost download with the existing attachment copy error', async () => {
  for (const result of [
    status({ exitCode: 1 }),
    status({ timedOut: true }),
    status({ state: 'lost', exitCode: null }),
  ]) {
    await expect(
      runAttachmentDownload(
        {
          startCommand: async () => ({ processId: 7 }),
          getCommandStatus: async () => result,
        },
        'sandbox',
        'download command',
      ),
    ).rejects.toMatchObject({ status: 503, code: 'attachment_copy_failed' })
  }
})

it('names the failed provider step, and marks only a provider without an answer as unanswered', async () => {
  // A status that the provider client does not list also has the kind
  // unavailable, but it is an answer.
  for (const error of [
    new ProviderError('rate_limited', 429),
    new ProviderError('unavailable', 405),
  ])
    await expect(
      runAttachmentDownload(
        {
          startCommand: async () => {
            throw error
          },
          getCommandStatus: async () => status(),
        },
        'sandbox',
        'download command',
      ),
    ).rejects.toMatchObject({
      step: 'start',
      unanswered: false,
      message:
        'The attached files could not reach the cloud computer. Try again.',
    })
  await expect(
    runAttachmentDownload(
      {
        startCommand: async () => ({ processId: 7 }),
        getCommandStatus: async () => {
          throw new ProviderError('unavailable', 503)
        },
      },
      'sandbox',
      'download command',
    ),
  ).rejects.toMatchObject({
    step: 'status',
    unanswered: true,
    message:
      'The cloud computer did not answer, so the attached files did not arrive. Try again.',
  })
})

it('waits short times between the first status checks, then 1 second', async () => {
  const running = status({ state: 'running', running: true, exitCode: null })
  const getCommandStatus = vi.fn(async () => running)
  for (let checks = 0; checks < 7; checks += 1)
    getCommandStatus.mockResolvedValueOnce(running)
  getCommandStatus.mockResolvedValueOnce(status())
  const wait = vi.fn<(ms: number) => Promise<void>>(async () => {})
  await runAttachmentDownload(
    { startCommand: async () => ({ processId: 7 }), getCommandStatus },
    'sandbox',
    'download command',
    wait,
  )
  expect(wait.mock.calls.map(([ms]) => ms)).toEqual([
    100, 200, 400, 800, 1_000, 1_000, 1_000,
  ])
})
