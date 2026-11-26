import {
  filterContinued,
  filterGitHubBanner,
  filterRepositoryChanged,
} from '../../src/shared/output-fields'
import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
  WorkspaceSocketMessage,
} from './workspace-events'

type LabelText = (value: string) => string

function eventLabeler(
  event: WorkspaceEvent,
): ((text: LabelText) => WorkspaceEvent) | undefined {
  switch (event.type) {
    case 'github.updated':
      return (text) => ({
        ...event,
        banner: filterGitHubBanner(event.banner, text),
      })
    case 'workspace.continued':
      return (text) => filterContinued(event, text)
    case 'workspace.repository-changed':
      return (text) => filterRepositoryChanged(event, text)
  }
}

/** Prepared labels keep every publication synchronous. */
export class WorkspaceEventLabels {
  private readonly text: LabelText

  constructor(text: LabelText) {
    this.text = text
  }

  event(event: WorkspaceEvent): WorkspaceEvent {
    return eventLabeler(event)?.(this.text) ?? event
  }

  envelope(envelope: WorkspaceEventEnvelope): WorkspaceEventEnvelope {
    return { ...envelope, event: this.event(envelope.event) }
  }

  history<Page extends { events: readonly WorkspaceEventEnvelope[] }>(
    history: Page,
  ): Page {
    return {
      ...history,
      events: history.events.map((envelope) => this.envelope(envelope)),
    }
  }

  message(message: WorkspaceSocketMessage): WorkspaceSocketMessage {
    return message.type === 'event'
      ? { ...message, envelope: this.envelope(message.envelope) }
      : { ...message, history: this.history(message.history) }
  }
}

/** A change or history read loads one capture only when an event needs it. */
export class WorkspaceEventLabelPreparation {
  private readonly read: () => Promise<WorkspaceEventLabels>
  private prepared: Promise<WorkspaceEventLabels> | undefined

  constructor(read: () => Promise<WorkspaceEventLabels>) {
    this.read = read
  }

  prepare(): Promise<WorkspaceEventLabels> {
    // An eager read must not fail an operation that emits no labeled event.
    // Keep its error for the first event that needs the failed filter.
    return (this.prepared ??= this.read().catch(
      (error: unknown) =>
        new WorkspaceEventLabels(() => {
          throw error
        }),
    ))
  }

  async event(event: WorkspaceEvent): Promise<WorkspaceEvent> {
    return eventLabeler(event) ? (await this.prepare()).event(event) : event
  }

  async history<Page extends { events: readonly WorkspaceEventEnvelope[] }>(
    history: Page,
  ): Promise<Page> {
    return history.events.some(({ event }) => eventLabeler(event))
      ? (await this.prepare()).history(history)
      : history
  }
}
