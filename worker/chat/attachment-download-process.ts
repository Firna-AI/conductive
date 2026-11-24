import { HttpError } from '../http'
import type { MachineChannel } from '../machines/channel'
import { CommandFailed } from '../warnings'
import { AttachmentTransferFailed } from './attachment-transfer-failure'

/**
 * The waits between the status checks of a download, in ms. The first
 * waits are short, so a small file reaches the cloud computer soon after
 * its curl exits. After them, each wait is the last one, 1 second.
 */
const DOWNLOAD_POLL_WAITS_MS: readonly number[] = [100, 200, 400, 800, 1_000]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** An unanswered host status read keeps the process and its output offsets. */
export function attachmentDownloadProcess(
  channel: Pick<MachineChannel, 'startCommand' | 'getCommandStatus'>,
  command: () => string | Promise<string>,
  wait: (ms: number) => Promise<void> = sleep,
): (retry?: AttachmentTransferFailed) => Promise<void> {
  let started: Awaited<ReturnType<MachineChannel['startCommand']>> | undefined
  let offsets = { stdoutOffset: 0, stderrOffset: 0 }
  let checks = 0
  const waitForPoll = () =>
    wait(
      DOWNLOAD_POLL_WAITS_MS[
        Math.min(checks++, DOWNLOAD_POLL_WAITS_MS.length - 1)
      ] ?? 1_000,
    )
  return async (retry) => {
    let waitForHost = false
    if (started?.route === 'host') {
      const failure = retry?.failure
      waitForHost =
        retry?.step === 'status' &&
        failure instanceof HttpError &&
        (failure.code === 'machine_unavailable' ||
          failure.code === 'machine_disconnected')
      if (!waitForHost) await waitForPoll()
    } else {
      const text = await command()
      started = await channel.startCommand(text).catch((error: unknown) => {
        throw new AttachmentTransferFailed('start', error)
      })
      offsets = { stdoutOffset: 0, stderrOffset: 0 }
      checks = 0
    }
    for (;;) {
      const read = waitForHost
        ? channel.getCommandStatus(started, offsets, { waitForHost: true })
        : channel.getCommandStatus(started, offsets)
      waitForHost = false
      const status = await read.catch((error: unknown) => {
        throw new AttachmentTransferFailed('status', error)
      })
      offsets = {
        stdoutOffset: status.stdoutNextOffset,
        stderrOffset: status.stderrNextOffset,
      }
      if (!status.running && !status.more) {
        if (
          status.state !== 'exited' ||
          status.exitCode !== 0 ||
          status.timedOut
        )
          throw new AttachmentTransferFailed(
            'command',
            new CommandFailed(
              status.state,
              status.exitCode,
              status.timedOut === true,
            ),
          )
        return
      }
      await waitForPoll()
    }
  }
}
