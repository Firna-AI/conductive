import type { RunnerEvent } from '../../src/shared/runner'
import type { RunnerFileEvent } from '../../src/shared/files'
import type { RetainedReport } from './report-state'
import {
  filterFileReport,
  filterOutput,
  filterRetainedReport,
} from './output-fields'

type Delta = Extract<RunnerEvent, { type: 'assistant.delta' }>
const REDACTION_MARKER = '[redacted]'

/** Holds only the suffix that can still become a known credential. */
export class OutputSanitizer {
  private readonly secrets = new Set<string>()
  private readonly pending = new Map<string, Delta>()

  add(secret: string): void {
    if (secret) this.secrets.add(secret)
  }

  fileReport(event: RunnerFileEvent): RunnerFileEvent {
    return filterFileReport(event, (value) => this.filter(value, true).text)
  }

  retainedReport(event: RetainedReport): RetainedReport {
    return filterRetainedReport(event, (value) => this.filter(value, true).text)
  }

  accept(event: RunnerEvent): RunnerEvent[] {
    if (event.type === 'assistant.delta') {
      const key = this.key(event)
      const text = (this.pending.get(key)?.text ?? '') + event.text
      const filtered = this.filter(text, false)
      if (filtered.held)
        this.pending.set(key, { ...event, text: filtered.held })
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
    for (const [key, event] of this.pending) {
      if (!matches(event)) continue
      this.pending.delete(key)
      result.push({ ...event, text: this.filter(event.text, true).text })
    }
    return result
  }

  private filter(text: string, final: boolean): { text: string; held: string } {
    const secrets = [...this.secrets].sort((a, b) => b.length - a.length)
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
    return filterOutput(event, (value) => this.filter(value, true).text)
  }
}
