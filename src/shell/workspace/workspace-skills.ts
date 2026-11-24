import { ParseError } from '../../app/api/parse'
import { readSkillsUpdated } from '../../app/api/read-workspace-reports'
import type { WorkspaceStream } from '../../app/events'
import type {
  MentionSkills,
  SkillsStore,
} from '../../chat/mentions/mention-skills'
import type { SkillLists } from '../../shared/generated/SkillLists'

/**
 * The latest skill lists of one workspace, from the ordered stream of its
 * model, for the list of `/` and the skill chips of its chat. It follows
 * the stream from before the first open, so it takes the latest report
 * from the seed or the stored history. Before such an event, the
 * lists load. A later event replaces the lists, also while the cloud
 * computer sleeps. The tab keeps the lists while it shows another page.
 */
export class WorkspaceSkills implements SkillsStore {
  private snapshot: MentionSkills = { state: 'loading' }
  private readonly listeners = new Set<() => void>()

  /** Reads the stream. The result ends the reading. */
  follow(stream: WorkspaceStream): () => void {
    return stream.subscribe(
      (envelope) => {
        if (envelope.type !== 'skills.updated') return
        let lists: SkillLists | null
        try {
          lists = readSkillsUpdated(envelope.event).skills
        } catch (error) {
          // A report that the app can't read leaves the last one in place.
          if (error instanceof ParseError) return
          throw error
        }
        this.setLists(lists)
      },
      undefined,
      ({ skills }) => {
        if (skills) this.setLists(skills.event.skills)
      },
    )
  }

  private setLists(lists: SkillLists | null): void {
    this.snapshot =
      lists === null ? { state: 'unavailable' } : { state: 'ready', lists }
    for (const listener of [...this.listeners]) listener()
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  readonly getSnapshot = (): MentionSkills => this.snapshot
}
