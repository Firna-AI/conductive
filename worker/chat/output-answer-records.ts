import type { RunnerEvent } from '../../src/shared/generated/RunnerEvent'
import type { HeldOutput } from '../../src/shared/output-sanitizer'
import type { AppEnv } from '../env'
import type { ChatTransaction } from './store'
import { answerOutputStream } from './output-answer-key'
import { readOutputSnapshot, saveOutputSnapshot } from './output-filter-records'
import { releasedOutput, unreleasedOutput } from './output-filter-snapshot'
import { prepareOutputState } from './output-filter-state'

type Answer = HeldOutput['event']

/** A virtual answer stream can also be a real stream with pending text. */
export class AnswerOutputRecords {
  private readonly env: AppEnv
  private readonly view: ChatTransaction
  private readonly workspaceId: string
  private readonly snapshots = new Map<string, HeldOutput[]>()
  private readonly answerStreams = new Map<string, Promise<string>>()
  private readonly changed = new Set<string>()
  private indexing = false

  constructor(env: AppEnv, view: ChatTransaction, workspaceId: string) {
    this.env = env
    this.view = view
    this.workspaceId = workspaceId
  }

  async initialize(active: ReadonlySet<string>): Promise<void> {
    const legacy = await this.view.output.readContexts()
    const format = await this.view.output.contextIndexFormat()
    if (
      !legacy &&
      format &&
      (this.env.CONDUCTIVE_SYMBOLIC_ANSWER_STATE !== 'true' ||
        format === 'symbolic')
    )
      return
    this.indexing = true
    const contexts = releasedOutput(
      await readOutputSnapshot(this.env, this.view, this.workspaceId, null),
    )
    for (const stream of await this.view.output.streams()) {
      const snapshot = await this.read(stream)
      const released = releasedOutput(snapshot)
      if (!released.length) continue
      contexts.push(...released)
      this.replace(stream, unreleasedOutput(snapshot))
    }
    const prepared = await prepareOutputState(
      this.env,
      this.workspaceId,
      contexts,
      active,
    )
    for (const held of prepared.snapshot)
      await this.replaceAnswer(held.event, [held])
  }

  async pending(stream: string): Promise<HeldOutput[]> {
    return unreleasedOutput(await this.read(stream))
  }

  affected(event: RunnerEvent, pending: readonly HeldOutput[]): Answer[] {
    if (
      event.type === 'assistant.delta' ||
      event.type === 'assistant.completed'
    )
      return [{ ...event, type: 'assistant.delta' }]
    if (event.type !== 'turn.completed' && event.type !== 'turn.failed')
      return []
    return pending.flatMap(({ event: held }) =>
      held.sessionId === event.sessionId && held.turnId === event.turnId
        ? [held]
        : [],
    )
  }

  async contexts(answers: readonly Answer[]): Promise<HeldOutput[]> {
    const contexts: HeldOutput[] = []
    for (const answer of answers)
      contexts.push(
        ...releasedOutput(await this.read(await this.answerStream(answer))),
      )
    return contexts
  }

  async save(
    stream: string,
    snapshot: readonly HeldOutput[],
    answers: readonly Answer[],
    active: ReadonlySet<string>,
  ): Promise<void> {
    this.replace(stream, [
      ...unreleasedOutput(snapshot),
      ...releasedOutput(await this.read(stream)),
    ])
    const released = releasedOutput(snapshot)
    for (const answer of answers)
      await this.replaceAnswer(
        answer,
        released.filter(
          ({ event }) =>
            event.sessionId === answer.sessionId &&
            event.turnId === answer.turnId &&
            event.messageId === answer.messageId,
        ),
      )
    for (const key of this.changed)
      await saveOutputSnapshot(
        this.env,
        this.view,
        this.workspaceId,
        key,
        this.snapshots.get(key) ?? [],
        active,
        active,
      )
    if (this.indexing) {
      await this.view.output.saveContexts(undefined)
      await this.view.output.saveContextIndexFormat(
        this.env.CONDUCTIVE_SYMBOLIC_ANSWER_STATE === 'true'
          ? 'symbolic'
          : 'legacy',
      )
    }
  }

  private async read(stream: string): Promise<HeldOutput[]> {
    let snapshot = this.snapshots.get(stream)
    if (!snapshot) {
      snapshot = await readOutputSnapshot(
        this.env,
        this.view,
        this.workspaceId,
        stream,
      )
      this.snapshots.set(stream, snapshot)
    }
    return snapshot
  }

  private replace(stream: string, snapshot: HeldOutput[]): void {
    if (
      JSON.stringify(this.snapshots.get(stream) ?? []) ===
      JSON.stringify(snapshot)
    )
      return
    this.snapshots.set(stream, snapshot)
    this.changed.add(stream)
  }

  private async replaceAnswer(answer: Answer, contexts: HeldOutput[]) {
    const stream = await this.answerStream(answer)
    this.replace(stream, [
      ...unreleasedOutput(await this.read(stream)),
      ...contexts,
    ])
  }

  private answerStream(answer: Answer): Promise<string> {
    const key = JSON.stringify([
      answer.sessionId,
      answer.turnId,
      answer.messageId,
    ])
    let stream = this.answerStreams.get(key)
    if (!stream) {
      stream = answerOutputStream(this.env, this.workspaceId, answer)
      this.answerStreams.set(key, stream)
    }
    return stream
  }
}
