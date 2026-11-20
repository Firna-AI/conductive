import type { SkillSource } from '../components/chat/SkillMentionList'
import { skillChipDraft, skillDrafts } from '../fixtures/skills'
import type { WorkspaceState } from './workspaceState'

type ComposerKey = WorkspaceState['composer']

/**
 * The draft and the skills of each state that opens the list of `/`: with
 * a query, without one, before the first skills report, without a report
 * from the runner, and with a repository without skills.
 */
const skillLists: Partial<
  Record<ComposerKey, { draft: string; source: SkillSource }>
> = {
  'skill-query': { draft: skillDrafts.query, source: 'latest' },
  'skill-start': { draft: skillDrafts.start, source: 'latest' },
  'skill-loading': { draft: skillDrafts.query, source: 'loading' },
  'skill-unavailable': { draft: skillDrafts.query, source: 'unavailable' },
  'skill-none': { draft: skillDrafts.start, source: 'none' },
}

/** The list of `/` of a composer state, if the state opens it. */
export function skillListFor(
  composer: ComposerKey,
): { draft: string; source: SkillSource } | undefined {
  return skillLists[composer]
}

/** The draft of a state with a skill chip in the text. */
export function skillChipFor(composer: ComposerKey): string | undefined {
  return composer === 'skill-chip' || composer === 'skill-chip-pointer'
    ? skillChipDraft
    : undefined
}
