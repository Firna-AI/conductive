import { InputActivityOwner } from '../lifecycle/input-activity-owner'
import { ManualChatClock } from '../chat/chat-clock.test-support'
import { warnWorker } from '../warnings'
import {
  readInputActivityTarget,
  writeWorkspaceActivity,
} from '../lifecycle/input-activity-data'

export function toolsActivity(db: D1Database, now: () => number) {
  const clock = new ManualChatClock(now())
  return new InputActivityOwner({
    now,
    schedule: clock.schedule,
    waitUntil: () => undefined,
    recordLocal: async () => undefined,
    update: async (id, at) => {
      const target = await readInputActivityTarget(db, id)
      if (target)
        await writeWorkspaceActivity(
          db,
          id,
          at,
          target.sandboxId,
          target.generation,
        )
    },
    warn: warnWorker,
  })
}
