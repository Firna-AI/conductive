import type { RunnerEvent } from './runner'
import type { RunnerFileEvent } from './files'
import {
  filterFileReport,
  filterOutput,
  filterRetainedReport,
} from './output-fields'

type Delta = Extract<RunnerEvent, { type: 'assistant.delta' }>
export interface HeldOutput {
  event: Delta
  secrets: readonly string[]
}
const REDACTION_MARKER = '[redacted]'

/** Holds only the suffix that can still become a known credential. */
export class OutputSanitizer {
  private readonly secrets = new Set<string>()
  private readonly pending = new Map<string, HeldOutput>()

  constructor(pending: readonly HeldOutput[] = []) {
    for (const held of pending) this.pending.set(this.key(held.event), held)
  }

  snapshot(): HeldOutput[] {
    return [...this.pending.values()]
  }

  add(secret: string): void {
    if (secret) this.secrets.add(secret)
  }

  text(value: string): string {
    return this.filter(value, true).text
  }

  fileReport(event: RunnerFileEvent): RunnerFileEvent {
    return filterFileReport(event, (value) => this.text(value))
  }

  retainedReport(event: RetainedReport): RetainedReport {
    return filterRetainedReport(event, (value) => this.text(value))
  }

  accept(event: RunnerEvent): RunnerEvent[] {
    if (event.type === 'assistant.delta') {
      const key = this.key(event)
      const previous = this.pending.get(key)
      const text = (previous?.event.text ?? '') + event.text
      const secrets = [
        ...new Set([...this.secrets, ...(previous?.secrets ?? [])]),
      ]
      const filtered = this.filter(text, false, secrets)
      if (filtered.held)
        this.pending.set(key, {
          event: { ...event, text: filtered.held },
          secrets: secrets.filter((secret) => secret.startsWith(filtered.held)),
        })
      else this.pending.delete(key)
      return filtered.text ? [{ ...event, text: filtered.text }] : []
    }
    const result: RunnerEvent[] = []
    if (event.type === 'assistant.completed')
      result.push(...this.flush((held) => this.key(held) === this.key(event)))
    if (event.type === 'turn.completed' || event.type === 'turn.failed') {
      result.push(
        ...this.flush(
          (held) =>
            held.sessionId === event.sessionId && held.turnId === event.turnId,
        ),
      )
    }
    result.push(this.clean(event))
    return result
  }

  private key(event: {
    sessionId: string
    turnId: string
    messageId: string
  }): string {
    return JSON.stringify([event.sessionId, event.turnId, event.messageId])
  }

  private flush(matches: (event: Delta) => boolean): RunnerEvent[] {
    const result: RunnerEvent[] = []
    for (const [key, held] of this.pending) {
      const { event } = held
      if (!matches(event)) continue
      this.pending.delete(key)
      result.push({
        ...event,
        text: this.filter(event.text, true, [...this.secrets, ...held.secrets])
          .text,
      })
    }
    return result
  }

  private filter(
    text: string,
    final: boolean,
    values: readonly string[] = [...this.secrets],
  ): { text: string; held: string } {
    const secrets = [...values].sort((a, b) => b.length - a.length)
    let output = ''
    let index = 0
    while (index < text.length) {
      const rest = text.slice(index)
      if (
        !final &&
        secrets.some(
          (secret) => secret.length > rest.length && secret.startsWith(rest),
        )
      )
        return { text: output, held: rest }
      const secret = secrets.find((secret) => text.startsWith(secret, index))
      if (
        text.startsWith(REDACTION_MARKER, index) &&
        (!secret || secret.length <= REDACTION_MARKER.length)
      ) {
        output += REDACTION_MARKER
        index += REDACTION_MARKER.length
      } else if (secret) {
        output += REDACTION_MARKER
        index += secret.length
      } else output += text[index++]
    }
    return { text: output, held: '' }
  }

  private clean(event: RunnerEvent): RunnerEvent {
    return filterOutput(event, (value) => this.text(value))
  }
}
type RetainedReport = Extract<
  RunnerEvent,
  { type: 'start.updated' | 'workspace.title' }
>
