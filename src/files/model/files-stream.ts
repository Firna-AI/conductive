import { parseStreamMessage, type StreamEnvelope } from '../api/parse-events'

/** Subscribes after an event number and returns the stop of the subscription. */
export type FilesSubscribe = (
  afterEventNumber: number,
  listener: (message: unknown) => void,
) => () => void

/** Keeps the store's progress through history pages and live events. */
export class FilesStream {
  private readonly subscribe: FilesSubscribe
  private readonly apply: (
    events: readonly StreamEnvelope[],
    history: boolean,
  ) => void
  private readonly replayed: () => void
  private last = 0
  private replaying = false
  private waiting: StreamEnvelope[] = []
  private subscription = 0
  private unsubscribe: (() => void) | null = null

  constructor(
    subscribe: FilesSubscribe,
    apply: (events: readonly StreamEnvelope[], history: boolean) => void,
    replayed: () => void,
  ) {
    this.subscribe = subscribe
    this.apply = apply
    this.replayed = replayed
  }

  start(after = this.last): void {
    this.last = after
    this.stop()
    const subscription = this.subscription
    const close = this.subscribe(after, (message) => {
      if (subscription === this.subscription) this.receive(message)
    })
    if (subscription === this.subscription) this.unsubscribe = close
    else close()
  }

  stop(): void {
    this.subscription += 1
    this.replaying = false
    this.waiting = []
    this.unsubscribe?.()
    this.unsubscribe = null
  }

  private receive(raw: unknown): void {
    const message = parseStreamMessage(raw)
    if (!message) return
    if (message.type === 'event') {
      if (this.replaying) this.waiting.push(message.envelope)
      else this.live(message.envelope)
      return
    }
    const events: StreamEnvelope[] = []
    const through = message.throughEventNumber
    for (const envelope of message.envelopes) {
      if (envelope.eventNumber <= this.last || envelope.eventNumber > through)
        continue
      this.last = envelope.eventNumber
      events.push(envelope)
    }
    const next = message.nextAfterEventNumber
    this.replaying = next !== null
    this.last = Math.max(
      this.last,
      next === null ? through : Math.min(next, through),
    )
    const subscription = this.subscription
    this.apply(events, true)
    if (this.replaying || subscription !== this.subscription) return
    const waiting = this.waiting.sort((a, b) => a.eventNumber - b.eventNumber)
    this.waiting = []
    for (const envelope of waiting) {
      this.live(envelope)
      if (subscription !== this.subscription) break
    }
    if (subscription === this.subscription) this.replayed()
  }

  private live(envelope: StreamEnvelope): void {
    const { eventNumber } = envelope
    if (eventNumber <= this.last) return
    if (eventNumber > this.last + 1) {
      this.start()
      return
    }
    this.last = eventNumber
    this.apply([envelope], false)
  }
}
