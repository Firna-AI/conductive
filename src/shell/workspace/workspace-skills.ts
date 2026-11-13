import {
  items,
  ParseError,
  record,
  text,
  type JsonObject,
} from '../../app/api/parse'
import type { WorkspaceStream } from '../../app/events'
import type {
  MentionSkills,
  SkillsStore,
} from '../../chat/mentions/mention-skills'
import type { AgentSkill } from '../../shared/skills'

function readSkill(value: unknown): AgentSkill {
  const skill = record(value, 'skill')
  return {
    name: text(skill, 'name'),
    description: text(skill, 'description'),
    ...(skill.manualOnly === true ? { manualOnly: true } : {}),
  }
}

/**
 * The skill lists of a `skills.updated` event. `skills: null` means that
 * the list is unavailable, as `SkillsUpdated` says.
 */
function readSkillsUpdated(event: JsonObject): MentionSkills {
  if (event.skills === null) return { state: 'unavailable' }
  const lists = record(event.skills, 'skills')
  return {
    state: 'ready',
    lists: {
      claude: items(lists, 'claude', readSkill),
      codex: items(lists, 'codex', readSkill),
    },
  }
}

/**
 * The latest skill lists of one workspace, from the ordered stream of its
 * model, for the list of `/` and the skill chips of its chat. It follows
 * the stream from before the first open, so it reads the stored history,
 * which keeps the latest `skills.updated` event. Before such an event, the
 * lists load. A later event replaces the lists, also while the cloud
 * computer sleeps. The tab keeps the lists while it shows another page.
 */
export class WorkspaceSkills implements SkillsStore {
  private snapshot: MentionSkills = { state: 'loading' }
  private readonly listeners = new Set<() => void>()

  /** Reads the stream. The result ends the reading. */
  follow(stream: WorkspaceStream): () => void {
    return stream.subscribe((envelope) => {
      if (envelope.type !== 'skills.updated') return
      try {
        this.snapshot = readSkillsUpdated(envelope.event)
      } catch (error) {
        // A report that the app can't read leaves the last one in place.
        if (error instanceof ParseError) return
        throw error
      }
      for (const listener of [...this.listeners]) listener()
    })
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  readonly getSnapshot = (): MentionSkills => this.snapshot
}
