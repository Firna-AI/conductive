import type { WorkspaceEventEnvelope } from '../shared/events'
import type { WorkspaceSeed } from '../shared/workspace-state-read'
import { emptyWorkspaceSeed } from './fixtures/workspace-seed'

/** The seed of a fake workspace, from its recorded events in number order. */
export function seedOf(
  events: readonly WorkspaceEventEnvelope[],
): WorkspaceSeed {
  const seed = {
    ...emptyWorkspaceSeed,
    failures: { ...emptyWorkspaceSeed.failures },
  }
  for (const { eventNumber, occurredAt, event } of events) {
    switch (event.type) {
      case 'ports.updated':
        seed.ports = { eventNumber, occurredAt, event }
        seed.failures[event.type] = null
        break
      case 'skills.updated':
        seed.skills = { eventNumber, occurredAt, event }
        break
      case 'start.updated':
      case 'workspace.title':
        seed.failures[event.type] = null
        break
      case 'runner.event-refused': {
        const kind = event.runnerEventType
        if (
          event.repairFailed === true &&
          event.sessionId === null &&
          event.turnId === null &&
          (kind === 'workspace.title' ||
            kind === 'start.updated' ||
            kind === 'ports.updated')
        ) {
          seed.failures[kind] ??= {
            eventNumber,
            occurredAt,
            event: {
              ...event,
              runnerEventType: kind,
              sessionId: null,
              turnId: null,
              repairFailed: true,
            },
          }
        }
        break
      }
    }
  }
  return seed
}
