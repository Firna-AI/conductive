import type { SkillTabView } from '../components/files/SkillPage'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { plansAgent } from '../fixtures/skillFiles'
import { plansSkill } from '../fixtures/skills'
import { skillPaths } from '../skillPaths'
import type { WorkspaceState } from './workspaceState'

/**
 * The view of the skill tab that the centre column shows, when the tab of
 * the state is the skill tab of `plans`: its Preview, its Source, or a
 * notice in place of its text.
 */
export function openSkill(state: WorkspaceState): SkillTabView | undefined {
  switch (state.tab) {
    case 'skill':
      return 'preview'
    case 'skill-source':
      return 'source'
    case 'skill-loading':
      return 'loading'
    case 'skill-gone':
      return 'gone'
    case 'skill-too-large':
      return 'too-large'
    case 'skill-older-software':
      return 'older-software'
    default:
      return undefined
  }
}

/** The screen of each view of the skill tab. */
const viewPaths: Readonly<Record<SkillTabView, string>> = {
  preview: skillPaths.preview,
  source: skillPaths.source,
  loading: skillPaths.loading,
  gone: skillPaths.gone,
  'too-large': skillPaths.tooLarge,
  'older-software': skillPaths.olderSoftware,
}

/**
 * The key of the skill tab of `plans`. A skill tab names its agent and its
 * skill, because two agents can hold skills with one name.
 */
const skillTabKey = `skill:${plansAgent}/${plansSkill.name}`

/**
 * The skill tab of `plans` that the state opens, at the end of the row, as
 * each new tab opens there. Its icon is the skill icon, and its title is
 * the name of the skill. Each view leads to its own screen.
 */
export function skillTab(state: WorkspaceState): WorkspaceTab | undefined {
  const view = openSkill(state)
  if (view === undefined) return undefined
  return {
    key: skillTabKey,
    kind: 'skill',
    title: plansSkill.name,
    to: viewPaths[view],
    selected: true,
  }
}

/** The skill tab of `plans`, which a keep kept, while another tab shows. */
export const keptSkillTab: WorkspaceTab = {
  key: skillTabKey,
  kind: 'skill',
  title: plansSkill.name,
  to: skillPaths.preview,
  selected: false,
}
