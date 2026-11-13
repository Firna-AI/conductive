import { HttpError } from '../http'
import type { SandboxProvider } from '../sandbox/provider'

export async function runAttachmentDownload(
  provider: Pick<SandboxProvider, 'startCommand' | 'getCommandStatus'>,
  sandboxId: string,
  command: string,
  wait: () => Promise<void> = () =>
    new Promise((resolve) => setTimeout(resolve, 1_000)),
): Promise<void> {
  const started = await provider.startCommand(sandboxId, command)
  let offsets = { stdoutOffset: 0, stderrOffset: 0 }
  while (true) {
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
    await wait()
  }
}
