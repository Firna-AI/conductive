import app from '../index'
import type { WorkspaceCompositionEnv } from '../chat/workspace-integration'
import { ManualChatClock } from '../chat/chat-clock.test-support'
import { Workspace as FeatureWorkspace } from './entry.test-support'

export class Workspace extends FeatureWorkspace {
  private readonly activityClock: ManualChatClock

  constructor(context: DurableObjectState, env: WorkspaceCompositionEnv) {
    const clock = new ManualChatClock(Date.now())
    super(context, env, clock.now, {}, clock.schedule)
    this.activityClock = clock
  }

  activityTime(): number {
    return this.activityClock.now()
  }

  advanceActivity(milliseconds: number): Promise<void> {
    return this.activityClock.advance(milliseconds)
  }

  waitForLocalActivity(): Promise<void> {
    return this.activity.localSettled()
  }

  recordInputBatch(workspaceId: string, times: readonly number[]): void {
    for (const at of times) this.activity.record(workspaceId, at)
  }

  readActivityAlarm(): Promise<number | null> {
    return this.ctx.storage.getAlarm()
  }
}

export default app
