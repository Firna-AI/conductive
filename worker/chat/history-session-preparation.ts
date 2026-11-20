import { HistoryPages } from './history-pages'
import type { QueueTurn } from './queue-turn'
import type { ChatStorage } from './types'

/** Each batch commits before the queue can run another chat operation. */
export async function prepareSessionHistory(
  storage: ChatStorage,
  through: number,
  turn?: QueueTurn,
): Promise<void> {
  while (!(await new HistoryPages(storage).sessionIndexReady(through))) {
    const done = await storage.transaction((data) =>
      new HistoryPages(data).prepareSessionBatch(through),
    )
    if (done) return
    if (turn) await turn.outside(async () => undefined)
  }
}
