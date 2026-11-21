import { warnWorker } from '../warnings'
import { errorSummary, WarningId } from '../warning-values'
import {
  runnerMessageSize,
  type RunnerProgress,
  type RunnerWorkWatch,
} from './runner-work-watch'
import type { ActiveRunner } from './types'

/**
 * Parses and handles one runner message. A failed message closes the
 * connection and writes a warning with the stage that failed. Call inside
 * the store queue.
 */
export async function receiveRunnerMessage(
  active: ActiveRunner,
  value: unknown,
  watch: RunnerWorkWatch,
  handle: (input: unknown, progress: RunnerProgress) => Promise<void>,
): Promise<void> {
  await watch.check()
  const progress: RunnerProgress = {
    stage: 'parse',
    size: runnerMessageSize(value),
    mark: null,
  }
  try {
    const input: unknown = typeof value === 'string' ? JSON.parse(value) : value
    await handle(input, progress)
  } catch (error) {
    warnWorker({
      kind: 'runner_message_failed',
      workspaceId: WarningId.checked(active.state.workspace.id),
      stage: progress.stage,
      error: errorSummary(error),
    })
    active.peer.close()
    throw error
  } finally {
    await progress.mark?.end()
  }
}
