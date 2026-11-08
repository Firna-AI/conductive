import app, { Workspace as ProductionWorkspace } from '../../index'
import { DEVICE_TEST_NOW } from '../../devices/clock.test-support'
import type { WorkspaceCompositionEnv } from '../workspace-integration'

export class Workspace extends ProductionWorkspace {
  private readonly pendingTitleWork: Promise<unknown>[]
  private readonly titleReplies: ((value: { response: string }) => void)[]
  private titleCalls = 0

  constructor(context: DurableObjectState, env: WorkspaceCompositionEnv) {
    const pending: Promise<unknown>[] = []
    const replies: ((value: { response: string }) => void)[] = []
    const waitUntil = context.waitUntil.bind(context)
    context.waitUntil = (work) => {
      pending.push(work)
      waitUntil(work)
    }
    const resolvers = {
      randomId: () => crypto.randomUUID(),
      runTitleModel: async () => {
        this.titleCalls++
        return new Promise<{ response: string }>((resolve) =>
          replies.push(resolve),
        )
      },
    }
    super(
      context,
      { ...env, CONDUCTIVE_TITLE_MODEL: 'test-title' },
      () => DEVICE_TEST_NOW,
      resolvers,
    )
    this.pendingTitleWork = pending
    this.titleReplies = replies
  }

  titleCallCount(): number {
    return this.titleCalls
  }

  completeTitle(response: string): void {
    this.titleReplies.shift()?.({ response })
  }

  async drainTitleWork(): Promise<void> {
    while (this.pendingTitleWork.length)
      await Promise.all(this.pendingTitleWork.splice(0))
  }
}

export default app
