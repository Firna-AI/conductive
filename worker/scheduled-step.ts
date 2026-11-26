import type { SIMPLE_WARNINGS } from './warning-types'
import { warnWorker } from './warnings'

export async function runScheduledStep(
  kind: keyof typeof SIMPLE_WARNINGS,
  action: () => Promise<unknown>,
): Promise<void> {
  try {
    await action()
  } catch {
    warnWorker({ kind })
  }
}
