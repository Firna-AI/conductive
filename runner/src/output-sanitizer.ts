import type { RunnerEvent } from '../../src/shared/runner'
import type { RunnerFileEvent } from '../../src/shared/files'
import { parseEvent } from './stored-events'
import type { RetainedReport } from './report-state'

type Delta = Extract<RunnerEvent, { type: 'assistant.delta' }>

/** Holds only the suffix that can still become a known credential. */
export class OutputSanitizer {
  private readonly secrets = new Set<string>()
  private readonly pending = new Map<string, Delta>()

  add(secret: string): void {
    if (secret) this.secrets.add(secret)
  }

  fileReport(event: RunnerFileEvent): RunnerFileEvent {
    const result = this.clean(event)
    if (
      result.type === 'files.snapshot' ||
      result.type === 'files.changed' ||
      result.type === 'changes.updated'
    )
      return result
    throw new Error('The filtered file report changed its type.')
  }

  retainedReport(event: RetainedReport): RetainedReport {
    const result = this.clean(event)
    if (result.type === 'start.updated' || result.type === 'workspace.title')
      return result
    throw new Error('The filtered retained report changed its type.')
  }

  accept(event: RunnerEvent): RunnerEvent[] {
    if (event.type === 'assistant.delta') {
      const key = this.key(event)
      const text = (this.pending.get(key)?.text ?? '') + event.text
      const filtered = this.filter(text, false)
      if (filtered.held)
        this.pending.set(key, { ...event, text: filtered.held })
      else this.pending.delete(key)
      return filtered.text
        ? [this.clean({ ...event, text: filtered.text })]
        : []
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
      result.push(
        this.clean({ ...event, text: this.filter(event.text, true).text }),
      )
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
      if (secret) {
        output += '[redacted]'
        index += secret.length
      } else output += text[index++]
    }
    return { text: output, held: '' }
  }

  private clean(event: RunnerEvent): RunnerEvent {
    return parseEvent(this.value(event))
  }

  private value(value: unknown): unknown {
    if (typeof value === 'string') return this.filter(value, true).text
    if (Array.isArray(value))
      return value.map((item: unknown) => this.value(item))
    if (typeof value === 'object' && value !== null)
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, this.value(item)]),
      )
    return value
  }
}
