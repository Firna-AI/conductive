import { HttpError } from '../http'
import type { SandboxProvider } from '../sandbox/provider'

/**
 * The waits between the status checks of a download, in ms. The first
 * waits are short, so a small file reaches the cloud computer soon after
 * its curl exits. After them, each wait is the last one, 1 second.
 */
const DOWNLOAD_POLL_WAITS_MS: readonly number[] = [
  100, 200, 400, 800, 1_000,
]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function runAttachmentDownload(
  provider: Pick<SandboxProvider, 'startCommand' | 'getCommandStatus'>,
  sandboxId: string,
  command: string,
  wait: (ms: number) => Promise<void> = sleep,
): Promise<void> {
  const started = await provider.startCommand(sandboxId, command)
  let offsets = { stdoutOffset: 0, stderrOffset: 0 }
  for (let checks = 0; ; checks += 1) {
    const status = await provider.getCommandStatus(
      sandboxId,
      started.processId,
      offsets,
    )
    offsets = {
      stdoutOffset: status.stdoutNextOffset,
      stderrOffset: status.stderrNextOffset,
    }
    if (!status.running && !status.more) {
      if (status.state !== 'exited' || status.exitCode !== 0 || status.timedOut)
        throw new HttpError(
          503,
          'attachment_copy_failed',
          'The attached files could not reach the cloud computer. Try again.',
        )
      return
    }
    await wait(
      DOWNLOAD_POLL_WAITS_MS[
        Math.min(checks, DOWNLOAD_POLL_WAITS_MS.length - 1)
      ] ?? 1_000,
    )
  }
}
