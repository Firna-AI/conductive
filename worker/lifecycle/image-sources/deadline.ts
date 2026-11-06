import type { SandboxProvider } from '../../sandbox/provider'

/** One heartbeat covers the whole operation, including pending Git HTTP reads. */
export async function withSourceDeadline(
  provider: SandboxProvider,
  sandboxId: string,
  prepare: () => Promise<void>,
): Promise<void> {
  let stopped = false
  let failed = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let renewing = Promise.resolve()
  const schedule = () => {
    timer = setTimeout(() => {
      if (stopped) return
      renewing = Promise.resolve()
        .then(() => provider.setAutoStop(sandboxId, 1_800))
        .then(() => {
          if (!stopped) schedule()
        })
        .catch(() => {
          failed = true
        })
    }, 300_000)
  }
  schedule()
  try {
    await prepare()
  } finally {
    stopped = true
    clearTimeout(timer)
    await renewing
  }
  if (failed) throw new Error('The active image build deadline could not renew')
}
