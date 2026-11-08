import WebSocket from 'ws'

import { workspaceEventsPath } from '../src/shared/events'
import {
  CheckError,
  integer,
  object,
  text,
  type LiveConfiguration,
} from './live-input'

interface Entry {
  number: number
  live: boolean
  event: Record<string, unknown>
}

export class LiveStream {
  readonly entries: Entry[] = []
  private readonly socket: WebSocket
  private failure: Error | null = null
  private waiters = new Set<() => void>()
  private closing = false
  through = 0

  constructor(config: LiveConfiguration, workspaceId: string) {
    const url = new URL(
      workspaceEventsPath(config.orgId, workspaceId),
      config.appOrigin,
    )
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    this.socket = new WebSocket(url, {
      headers: { Cookie: config.cookie, Origin: config.appOrigin },
      handshakeTimeout: 30_000,
    })
    this.socket.on('message', (data) => {
      try {
        const message = object(JSON.parse(data.toString()))
        if (message.type === 'history') {
          const history = object(message.history)
          if (!Array.isArray(history.events))
            throw new CheckError('Invalid event history.')
          for (const event of history.events) this.append(event, false)
          if (integer(history.throughEventNumber) !== this.through)
            throw new CheckError(
              'The event history cursor does not match its last event.',
            )
        } else if (message.type === 'event') this.append(message.envelope, true)
        else
          throw new CheckError('The workspace sent an unknown socket message.')
      } catch {
        this.failure = new CheckError(
          'The workspace event stream is invalid or out of order.',
        )
      }
      for (const waiter of this.waiters) waiter()
    })
    this.socket.on('error', () =>
      this.failed('The workspace event socket failed.'),
    )
    this.socket.on('close', () => {
      if (!this.closing)
        this.failed(
          'The workspace event socket closed before the check finished.',
        )
    })
  }

  private failed(message: string) {
    this.failure = new CheckError(message)
    for (const waiter of this.waiters) waiter()
  }

  private append(value: unknown, live: boolean) {
    const envelope = object(value)
    const number = integer(envelope.eventNumber)
    if (number !== this.through + 1)
      throw new CheckError('The event stream has a gap or duplicate.')
    this.entries.push({ number, live, event: object(envelope.event) })
    this.through = number
  }

  private wait<T>(read: () => T | null): Promise<T> {
    return new Promise((resolve, reject) => {
      const finish = () => {
        if (this.failure) return done(this.failure)
        try {
          const result = read()
          if (result !== null) done(null, result)
        } catch {
          done(
            new CheckError(
              'The agent turn failed or its answer did not match the check.',
            ),
          )
        }
      }
      const done = (error: Error | null, result?: T) => {
        clearTimeout(timer)
        this.waiters.delete(finish)
        if (error) reject(error)
        else if (result !== undefined) resolve(result)
      }
      const timer = setTimeout(
        () =>
          done(new CheckError('Timed out while waiting for the agent stream.')),
        600_000,
      )
      this.waiters.add(finish)
      finish()
    })
  }

  opened(): Promise<boolean> {
    return this.wait(() => (this.entries.length ? true : null))
  }

  turn(messageId: string, marker: string, requireLive: boolean) {
    return this.wait(() => {
      const sent = this.entries.find(
        ({ event }) =>
          event.type === 'message.sent' && event.messageId === messageId,
      )
      if (!sent) return null
      const turnId = text(sent.event.turnId)
      const events = this.entries.filter(({ event }) => event.turnId === turnId)
      if (events.some(({ event }) => event.type === 'turn.failed'))
        throw new CheckError('Agent turn failed.')
      const completed = events.find(
        ({ event }) => event.type === 'turn.completed',
      )
      if (!completed) return null
      const answer = events.find(
        ({ event }) =>
          event.type === 'assistant.completed' &&
          typeof event.text === 'string' &&
          event.text.includes(marker),
      )
      const deltas = events.filter(
        ({ event, live }) =>
          event.type === 'assistant.delta' && (!requireLive || live),
      )
      if (completed.event.state !== 'finished' || !answer || !deltas.length)
        throw new CheckError(
          'The check needs a finished answer and a streamed text event.',
        )
      return {
        turnId,
        liveDeltas: deltas.filter((entry) => entry.live).length,
        throughEventNumber: completed.number,
      }
    })
  }

  close() {
    this.closing = true
    this.socket.close()
  }
}
