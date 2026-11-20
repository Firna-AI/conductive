import type { Session } from './generated/Session'
import type { SecretWorkspaceEvent } from './secret-requests'
import {
  secretRequestMarkdown,
  secretRunMarkdown,
} from './secret-request-markdown'
import type { TranscriptItem } from './transcript/transcript'
import type { SessionEnvelopeInput } from './transcript/session-events'
import { placeCommands } from './transcript/command-placement'
import type { TranscriptInsert } from './transcript/transcript-entries'
import { plainText } from './transcript/markdown-code'

export interface SecretTranscriptContent {
  turnId: string
  markdown: string
}

export class SecretRequestTranscript {
  private readonly requests = new Map<
    string,
    {
      event: Extract<SecretWorkspaceEvent, { type: 'secrets.request.updated' }>
      number: number
      firstNumber: number
      at: number
    }
  >()
  private readonly runs = new Map<
    string,
    {
      event: Extract<SecretWorkspaceEvent, { type: 'secrets.run' }>
      number: number
      at: number
    }
  >()
  private readonly notices = new Map<
    string,
    {
      event: Extract<SecretWorkspaceEvent, { type: 'secrets.notice' }>
      number: number
      at: number
    }
  >()

  merge(sessionId: string, events: readonly SessionEnvelopeInput[]) {
    for (const { event, eventNumber, occurredAt } of events) {
      if (!event || !('sessionId' in event) || event.sessionId !== sessionId)
        continue
      if (event.type === 'secrets.request.updated') {
        const previous = this.requests.get(event.request.id)
        const firstNumber = Math.min(
          previous?.firstNumber ?? eventNumber,
          eventNumber,
        )
        if (!previous || previous.number < eventNumber)
          this.requests.set(event.request.id, {
            event,
            number: eventNumber,
            firstNumber,
            at: event.request.createdAt,
          })
        else previous.firstNumber = firstNumber
      } else if (event.type === 'secrets.run')
        this.runs.set(event.id, { event, number: eventNumber, at: occurredAt })
      else if (event.type === 'secrets.notice')
        this.notices.set(event.requestId, {
          event,
          number: eventNumber,
          at: occurredAt,
        })
    }
  }

  inserts(
    items: readonly TranscriptItem[],
    times: ReadonlyMap<string, number>,
    session: Session,
    orgName: string | null,
  ): TranscriptInsert<SecretTranscriptContent>[] {
    const records = [
      ...[...this.requests.values()]
        .filter(({ event }) => !this.runs.has(event.request.id))
        .map(({ event, firstNumber, at }) => ({
          id: event.request.id,
          turnId: event.request.turnId,
          createdAt: at,
          number: firstNumber,
          markdown: secretRequestMarkdown(event.request, session, orgName),
          unfolded: event.request.late || event.request.state === 'waiting',
        })),
      ...[...this.runs.values()].map(({ event, number, at }) => ({
        id: event.id,
        turnId: event.turnId,
        createdAt: at,
        number,
        markdown: secretRunMarkdown(event),
        unfolded: false,
      })),
      ...[...this.notices.values()].map(({ event, number, at }) => ({
        id: `notice:${event.requestId}`,
        turnId: event.turnId,
        createdAt: at,
        number,
        markdown: plainText(event.text),
        unfolded: true,
      })),
    ].sort((a, b) => a.createdAt - b.createdAt || a.number - b.number)
    return placeCommands(items, times, records).map(({ request, after }) => ({
      key: `secret:${request.id}`,
      after,
      content: { turnId: request.turnId, markdown: request.markdown },
      ...(request.unfolded ? { unfolded: true } : {}),
    }))
  }
}
