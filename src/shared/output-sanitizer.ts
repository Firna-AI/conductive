import type { RunnerEvent } from './generated/RunnerEvent'
import type { RunnerFileEvent } from './generated/RunnerFileEvent'
import { filterFileReport, filterRetainedReport } from './output-fields'
import { LegacyOutputSanitizer } from './output-sanitizer-legacy'
import {
  SymbolicOutputSanitizer,
  type HeldOutput,
  type OutputMatching,
} from './output-symbolic'

export type { HeldOutput } from './output-symbolic'

type AnswerSanitizer = LegacyOutputSanitizer | SymbolicOutputSanitizer
type RetainedReport = Extract<
  RunnerEvent,
  { type: 'start.updated' | 'workspace.title' }
>

/** Answer state retains its format when promotion is disabled during rollback. */
export class OutputSanitizer {
  private readonly values = new Set<string>()
  private readonly cleaner = new LegacyOutputSanitizer()
  private readonly answers = new Map<string, AnswerSanitizer>()
  private readonly matching?: OutputMatching

  constructor(pending: readonly HeldOutput[] = [], matching?: OutputMatching) {
    this.matching = matching
    for (const held of pending) {
      const sanitizer =
        held.symbolic && matching
          ? new SymbolicOutputSanitizer(held, matching)
          : new LegacyOutputSanitizer([held])
      this.answers.set(this.key(held.event), sanitizer)
    }
  }

  snapshot(): HeldOutput[] {
    return [...this.answers.values()].flatMap((answer) => answer.snapshot())
  }

  add(secret: string): void {
    if (!secret) return
    this.values.add(secret)
    this.cleaner.add(secret)
    for (const answer of this.answers.values())
      if (answer instanceof LegacyOutputSanitizer) answer.add(secret)
  }

  text(value: string): string {
    return this.cleaner.text(value)
  }

  fileReport(event: RunnerFileEvent): RunnerFileEvent {
    return filterFileReport(event, (value) => this.text(value))
  }

  retainedReport(event: RetainedReport): RetainedReport {
    return filterRetainedReport(event, (value) => this.text(value))
  }

  accept(event: RunnerEvent): RunnerEvent[] {
    if (
      event.type === 'assistant.delta' ||
      event.type === 'assistant.completed'
    ) {
      const key = this.key(event)
      let answer = this.answers.get(key)
      if (!answer) {
        answer = this.matching?.enabled
          ? new SymbolicOutputSanitizer(
              {
                event: { ...event, type: 'assistant.delta', text: '' },
                secrets: [],
                symbolic: { salt: this.matching.salt, contexts: [] },
              },
              this.matching,
            )
          : new LegacyOutputSanitizer()
        if (answer instanceof LegacyOutputSanitizer)
          for (const value of this.values) answer.add(value)
        this.answers.set(key, answer)
      }
      const result = answer.accept(event)
      if (!answer.snapshot().length) this.answers.delete(key)
      return result
    }
    const result: RunnerEvent[] = []
    if (event.type === 'turn.completed' || event.type === 'turn.failed') {
      for (const answer of this.answers.values()) {
        const held = answer.snapshot()[0]
        if (
          held?.event.sessionId === event.sessionId &&
          held.event.turnId === event.turnId
        )
          result.push(
            ...answer
              .accept(event)
              .filter((event) => event.type === 'assistant.delta'),
          )
      }
    }
    return [...result, ...this.cleaner.accept(event)]
  }

  private key(event: {
    sessionId: string
    turnId: string
    messageId: string
  }): string {
    return JSON.stringify([event.sessionId, event.turnId, event.messageId])
  }
}
