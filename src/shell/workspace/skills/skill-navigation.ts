import { useEffect, useMemo } from 'react'
import { useNavigation } from '../../../app/navigation'
import type { SkillIdentity } from '../../../shared/skills'
import type { SkillTab, WorkspaceView } from '../../../shared/workspace-view'
import type { SavedView, WorkspaceContext } from '../features'
import { withActiveTab, withKeptTab } from '../files/view-tabs'
import { saveView, useViewKnown } from '../saved-view'
import { skillHref } from './skill-address'

/** The skill tab of a skill, with no other field. */
export function skillTab(skill: SkillIdentity): SkillTab {
  return { kind: 'skill', agent: skill.agent, name: skill.name }
}

/** The skill tabs of a view, in the order of the tab row. */
export function skillTabsOf(view: WorkspaceView | null): SkillTab[] {
  return (view?.tabs ?? []).filter(
    (tab): tab is SkillTab => tab.kind === 'skill',
  )
}

/**
 * The navigation of the skill tabs of the open workspace. `open` saves the
 * skill tab as the open and active tab, then moves the address, as a press
 * on a skill chip does. A skill with no tab opens in the temporary tab, as
 * `Temporary tabs` says. `keep` saves the view with the tab kept, as a
 * double-click on the tab does, and moves no address.
 */
export interface SkillNavigation {
  href: (skill: SkillIdentity) => string
  open: (skill: SkillIdentity) => void
  keep: (skill: SkillIdentity) => void
}

/** The navigation of the skill tabs of the workspace of `context`. */
export function useSkillNavigation(context: WorkspaceContext): SkillNavigation {
  const navigation = useNavigation()
  const { org, workspace, savedView } = context
  return useMemo(() => {
    const href = (skill: SkillIdentity) =>
      skillHref(org.id, workspace.id, skill)
    return {
      href,
      open: (skill) => {
        saveView(savedView, (view) => withActiveTab(view, skillTab(skill)))
        navigation.push(href(skill))
      },
      keep: (skill) =>
        saveView(savedView, (view) => withKeptTab(view, skillTab(skill))),
    }
  }, [navigation, org.id, workspace.id, savedView])
}

/**
 * A skill page that shows keeps its tab open and active in the saved view,
 * also when its address came from a link or the browser history. A skill
 * with no tab opens in the temporary tab, as a press opens it. After a
 * press, the view shows the tab already, so this saves nothing.
 */
export function useOpenSkillTab(saved: SavedView, skill: SkillIdentity): void {
  const known = useViewKnown(saved)
  const { agent, name } = skill
  useEffect(() => {
    if (!known) return
    saved.updateView((view) => withActiveTab(view, skillTab({ agent, name })))
  }, [saved, known, agent, name])
}
