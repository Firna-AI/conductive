import app, { Workspace as ProductionWorkspace } from '../../index'
import { DEVICE_TEST_NOW } from '../../devices/clock.test-support'
import type { WorkspaceCompositionEnv } from '../workspace-integration'

export class Workspace extends ProductionWorkspace {
  private readonly pendingTitleWork: Promise<unknown>[]
  private readonly titleReplies: ((value: { response: string }) => void)[]
  private readonly titleInputs: AiTextGenerationInput[] = []
  private titleReaders: {
    after: number
    resolve: (input: AiTextGenerationInput) => void
  }[] = []

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
      runTitleModel: async (_model: string, input: AiTextGenerationInput) => {
        this.titleInputs.push(structuredClone(input))
        this.titleReaders = this.titleReaders.filter((reader) => {
          const recorded = this.titleInputs[reader.after]
          if (!recorded) return true
          reader.resolve(recorded)
          return false
        })
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
    return this.titleInputs.length
  }

  waitForTitleCall(after = 0): Promise<AiTextGenerationInput> {
    const recorded = this.titleInputs[after]
    return recorded
      ? Promise.resolve(recorded)
      : new Promise((resolve) => this.titleReaders.push({ after, resolve }))
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
