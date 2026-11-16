import { expect, it, vi } from 'vitest'
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
  const wait = vi.fn(async () => {})
  await runAttachmentDownload(provider, 'sandbox', 'download command', wait)
  expect(provider.startCommand.mock.calls).toEqual([
    ['sandbox', 'download command'],
  ])
  expect(provider.getCommandStatus.mock.calls).toEqual([
    ['sandbox', 7, { stdoutOffset: 0, stderrOffset: 0 }],
    ['sandbox', 7, { stdoutOffset: 5, stderrOffset: 3 }],
    ['sandbox', 7, { stdoutOffset: 10, stderrOffset: 6 }],
  ])
  expect(wait).toHaveBeenCalledTimes(2)
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
