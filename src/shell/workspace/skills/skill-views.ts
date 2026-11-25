import { useState } from 'react'
import { TabPlaces, useFollowTabs } from '../../../app/tab-places'
import type { SkillsStore } from '../../../chat/mentions/mention-skills'
import { tabKey } from '../../../chat/state/tab-order'
import type { FileMode } from '../../../files/navigation'
import type { WorkspaceContext } from '../features'
import { useSavedView } from '../saved-view'
import { skillTabsOf } from './skill-navigation'

/**
 * The view of each skill tab of one workspace, Preview or Source, for as
 * long as the tab keeps the skill lists of the workspace. The lists are
 * the one kept store of skills of each workspace, so they key the views.
 */
const views = new WeakMap<SkillsStore, TabPlaces<FileMode>>()

/**
 * The views of the skill tabs of the workspace of `skills`, by the key of
 * each tab. A reload forgets them, so a tab starts in Preview.
 */
function skillViews(skills: SkillsStore): TabPlaces<FileMode> {
  const known = views.get(skills)
  if (known) return known
  const made = new TabPlaces<FileMode>()
  views.set(skills, made)
  return made
}

/**
 * The view that the skill tab with the key `tab` shows, and its change. A
 * tab starts in Preview, and keeps its view while another tab shows, until
 * it closes. A switch keeps the state of the tab, temporary or kept, so it
 * saves nothing in the saved view.
 */
export function useSkillView(
  skills: SkillsStore,
  tab: string,
): [FileMode, (mode: FileMode) => void] {
  const places = skillViews(skills)
  const [mode, setMode] = useState<FileMode>(() => places.get(tab) ?? 'preview')
  const change = (next: FileMode) => {
    places.set(tab, next)
    setMode(next)
  }
  return [mode, change]
}

/**
 * A skill tab that leaves the saved view, such as one that a file of the
 * temporary tab replaced, forgets its view, so the skill opens again in
 * Preview. The workspace screen draws this part in each layout, so it
 * follows the tabs also while a phone shows Files, where no chat shows.
 */
export function ForgetClosedSkillViews(props: {
  context: WorkspaceContext
}): null {
  const view = useSavedView(props.context.savedView)
  useFollowTabs(
    skillViews(props.context.skills),
    view ? skillTabsOf(view).map(tabKey) : null,
  )
  return null
}
