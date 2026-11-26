import { useMemo, type ReactNode } from 'react'
import { useNavigation } from '../../../app/navigation'
import { routes } from '../../../app/router'
import type { RenderedTab, TabDraw } from '../../../chat/components/tab-row'
import { tabKey } from '../../../chat/state/tab-order'
import { KeptScroll } from '../../../files/ui/kept-scroll'
import type { SkillIdentity } from '../../../shared/skills'
import type { SkillTab, WorkspaceTab } from '../../../shared/workspace-view'
import { usePageEscape } from '../../shortcuts/page-escape'
import { useShortcutOffer } from '../../shortcuts/shortcut-context'
import type { WorkspaceContext } from '../features'
import { isTemporaryTab, withoutTab } from '../files/view-tabs'
import { useKeptFiles } from '../files/workspace-files'
import { useSavedView } from '../saved-view'
import { skillPlace } from './skill-address'
import {
  skillTab,
  skillTabsOf,
  useSkillNavigation,
  type SkillNavigation,
} from './skill-navigation'
import { LiftedSkillTab, SkillTabItem } from './SkillTabItem'
import { SkillTabPage } from './SkillTabPage'

/** Whether two skill tabs show one skill of one agent. */
function sameSkill(left: SkillIdentity, right: SkillIdentity): boolean {
  return left.agent === right.agent && left.name === right.name
}

/**
 * A skill tab of the saved view, at the place in the tab row that the chat
 * gives it, in italics when the view marks it as the temporary tab. Close
 * of the shown tab shows the next skill tab, else the one before, else the
 * chat with its session, as for a file tab. A close of the temporary tab
 * clears the mark. While the tab shows, the key of Close tab closes it, as
 * its Close does. While the temporary tab shows, Escape closes it too, when
 * no menu, dialog, drag, or text field takes the key.
 */
function SkillTabRow(props: {
  context: WorkspaceContext
  navigation: SkillNavigation
  /** The skill whose tab the address shows, or null. */
  shown: SkillIdentity | null
  skill: SkillTab
  temporary: boolean
  draw: Extract<TabDraw, { kind: 'row' }>
}) {
  const { context, navigation, shown, skill } = props
  const go = useNavigation()
  const tabs = skillTabsOf(useSavedView(context.savedView))
  const selected = shown !== null && sameSkill(shown, skill)
  const close = () => {
    const index = tabs.findIndex((open) => sameSkill(open, skill))
    const rest = tabs.filter((open) => !sameSkill(open, skill))
    const next = selected
      ? (rest[Math.min(index, rest.length - 1)] ?? null)
      : null
    const sessionId = context.savedView.getSnapshot().activeSessionId
    const session: WorkspaceTab | null = sessionId
      ? { kind: 'session', sessionId }
      : null
    context.savedView.updateView((view) =>
      withoutTab(view, skill, next ?? session),
    )
    if (!selected) return
    go.push(
      next
        ? navigation.href(next)
        : routes.workspace(context.org.id, context.workspace.id),
    )
  }
  useShortcutOffer('close-tab', selected ? close : null)
  usePageEscape(selected && props.temporary ? close : null)
  return (
    <SkillTabItem
      close={props.draw.close}
      item={props.draw.item}
      link={props.draw.link}
      navigation={navigation}
      onClose={close}
      selected={selected}
      skill={skill}
      temporary={props.temporary}
    />
  )
}

/**
 * The skill tab of the address in the centre of a desktop. It keeps its
 * scroll offset in the kept files of the workspace, one for each view, as
 * a file tab does.
 */
function SkillCentrePage(props: {
  context: WorkspaceContext
  skill: SkillIdentity
}) {
  const { context, skill } = props
  const files = useKeptFiles(context)
  const tab = tabKey(skillTab(skill))
  const kept = useMemo(
    () => ({ places: files.scrollPlaces, tab }),
    [files, tab],
  )
  return (
    <KeptScroll.Provider value={kept}>
      <SkillTabPage context={context} layout="desktop" skill={skill} />
    </KeptScroll.Provider>
  )
}

/** What the chat gets from the skill tabs of the desktop. */
export interface SkillCentre {
  /** Names and draws a skill tab of the row. */
  renderTab: (tab: SkillTab) => RenderedTab
  /** The page of the skill tab of the address in place of the chat, or null. */
  content: ReactNode
}

/**
 * The skill tabs of the centre row on desktop, as
 * `docs/protocol/skill-tabs.md` says. The address `skills/<agent>/<name>`
 * shows the tab of the skill in place of the chat. Each tab is named by the
 * name of its skill, and its tab menu has Keep open while it is the
 * temporary tab, the moves, and the closes, but no Copy path, because a
 * skill tab has no path. A phone shows the skill as a page of the Files
 * tab, and an archived workspace has no skill tabs.
 */
export function useSkillCentre(context: WorkspaceContext): SkillCentre {
  const navigation = useSkillNavigation(context)
  const view = useSavedView(context.savedView)
  const desktop = context.viewport !== 'phone' && context.sandbox !== 'archived'
  const shown = desktop ? skillPlace(context.view) : null
  const renderTab = (tab: SkillTab): RenderedTab => {
    const temporary = isTemporaryTab(view, tab)
    return {
      title: tab.name,
      draw: (draw) =>
        draw.kind === 'lifted' ? (
          <LiftedSkillTab name={tab.name} temporary={temporary} />
        ) : (
          <SkillTabRow
            context={context}
            draw={draw}
            navigation={navigation}
            shown={shown}
            skill={tab}
            temporary={temporary}
          />
        ),
      show: () => navigation.open(tab),
      keep: temporary ? () => navigation.keep(tab) : null,
      // A skill tab names a skill, not a file, so its menu has no Copy path.
      copyPath: null,
    }
  }
  return {
    renderTab,
    content: shown ? (
      <SkillCentrePage
        context={context}
        key={tabKey(skillTab(shown))}
        skill={shown}
      />
    ) : null,
  }
}
