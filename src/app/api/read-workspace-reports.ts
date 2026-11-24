import type { AgentSkill } from '../../shared/generated/AgentSkill'
import type { ListeningPort } from '../../shared/generated/ListeningPort'
import type { SkillsUpdated } from '../../shared/generated/SkillsUpdated'
import type { RunnerEventRefused } from '../../shared/chat-events'
import type { PortsUpdated } from '../../shared/ports'
import type {
  WorkspaceNoticeKind,
  WorkspaceReportFailure,
} from '../../shared/workspace-state-read'
import {
  choice,
  count,
  items,
  maybeText,
  record,
  text,
  type JsonObject,
} from './parse'

function readListeningPort(value: unknown): ListeningPort {
  const port = record(value, 'port')
  return {
    port: count(port, 'port'),
    name: maybeText(port, 'name'),
    folder: maybeText(port, 'folder'),
  }
}

/** A null list means that the workspace has no current port report. */
export function readPortsUpdated(event: JsonObject): PortsUpdated {
  return {
    type: 'ports.updated',
    ports:
      event.ports === null ? null : items(event, 'ports', readListeningPort),
  }
}

function readSkill(value: unknown): AgentSkill {
  const skill = record(value, 'skill')
  return {
    name: text(skill, 'name'),
    description: text(skill, 'description'),
    ...(skill.manualOnly === true ? { manualOnly: true } : {}),
  }
}

/** A null list means that the skills are unavailable. */
export function readSkillsUpdated(event: JsonObject): SkillsUpdated {
  const lists = event.skills === null ? null : record(event.skills, 'skills')
  return {
    type: 'skills.updated',
    skills: lists && {
      claude: items(lists, 'claude', readSkill),
      codex: items(lists, 'codex', readSkill),
    },
  }
}

const reasons: readonly RunnerEventRefused['reason'][] = [
  'too_large',
  'invalid',
  'turn_not_active',
]

/** Reads the details of a marker after its kind and failure flag are checked. */
export function readFailedRepair(
  event: JsonObject,
  kind: WorkspaceNoticeKind,
): WorkspaceReportFailure['event'] {
  return {
    type: 'runner.event-refused',
    streamId: text(event, 'streamId'),
    runnerEventNumber: count(event, 'runnerEventNumber'),
    runnerEventType: kind,
    reason: choice(event, 'reason', reasons),
    sessionId: null,
    turnId: null,
    repairFailed: true,
  }
}
