import { isSkillName, type SkillIdentity } from '../../shared/skills'
import type {
  SkillTab,
  SkillTabPlace,
  WorkspaceTab,
  WorkspaceView,
} from '../../shared/workspace-view'
import { isRecord } from './json'

// The view route keeps the skill tabs in their own fields, and the app keeps
// them in the row of its view, as `SkillTab` says. These functions move the
// skill tabs between the two shapes.

/** The skill tab of a skill, with no other field. */
function skillTab(skill: SkillIdentity): SkillTab {
  return { kind: 'skill', agent: skill.agent, name: skill.name }
}

/** The skill of a skill tab, with no other field. */
function identityOf(tab: SkillTab): SkillIdentity {
  return { agent: tab.agent, name: tab.name }
}

function skillKey(skill: SkillIdentity): string {
  return JSON.stringify([skill.agent, skill.name])
}

/**
 * A skill of the route: an agent of the app and a name that a skill text
 * can hold, or null.
 */
export function readSkill(value: unknown): SkillIdentity | null {
  if (!isRecord(value)) return null
  const { agent, name } = value
  return (agent === 'claude' || agent === 'codex') &&
    typeof name === 'string' &&
    isSkillName(name)
    ? { agent, name }
    : null
}

/**
 * The skill tabs of the route, each with its place in the whole row. A
 * value that is not a list reads as no skill tab, and a tab that does not
 * read drops, so a skill tab of a newer app costs only that tab, as a mark
 * that does not read costs only the mark.
 */
export function readSkillPlaces(value: unknown): SkillTabPlace[] {
  if (!Array.isArray(value)) return []
  const places: unknown[] = value
  return places.flatMap((item) => {
    const skill = readSkill(item)
    const place = isRecord(item) ? item.place : undefined
    return skill !== null &&
      typeof place === 'number' &&
      Number.isSafeInteger(place) &&
      place >= 0
      ? [{ ...skill, place }]
      : []
  })
}

/**
 * The view of the app from the view of the route: each skill tab of
 * `skillTabs` at its place in the row, which already holds the Preview
 * tabs, or at the end when the row is shorter. A skill keeps its first tab.
 * `activeSkill` makes its open tab the active tab, and `temporarySkill`
 * marks its open tab as the temporary tab, unless the view already has
 * such a tab. The skill fields go, so only the row holds the skill tabs.
 */
export function withSkillTabsInRow(view: WorkspaceView): WorkspaceView {
  const {
    skillTabs = [],
    activeSkill = null,
    temporarySkill = null,
    ...rest
  } = view
  const tabs: WorkspaceTab[] = [...rest.tabs]
  const open = new Set<string>()
  const ordered = [...skillTabs].sort((left, right) => left.place - right.place)
  for (const place of ordered) {
    const key = skillKey(place)
    if (open.has(key)) continue
    open.add(key)
    tabs.splice(Math.min(place.place, tabs.length), 0, skillTab(place))
  }
  const opened = (skill: SkillIdentity | null): SkillTab | null =>
    skill !== null && open.has(skillKey(skill)) ? skillTab(skill) : null
  return {
    ...rest,
    tabs,
    activeTab: rest.activeTab ?? opened(activeSkill),
    temporaryTab: rest.temporaryTab ?? opened(temporarySkill),
  }
}

/**
 * The view as the view route takes it: each skill tab of the row in
 * `skillTabs`, with its place in the whole row, and not in `tabs`. The
 * active skill tab is `activeSkill`, and the temporary skill tab is
 * `temporarySkill`. The view always holds `skillTabs`, also an empty list,
 * because the Worker keeps the stored skill tabs for a save without it, as
 * for a save of an older app.
 */
export function withSkillTabsApart(view: WorkspaceView): WorkspaceView {
  const tabs: WorkspaceTab[] = []
  const skillTabs: SkillTabPlace[] = []
  view.tabs.forEach((tab, place) => {
    if (tab.kind === 'skill') {
      skillTabs.push({ agent: tab.agent, name: tab.name, place })
    } else tabs.push(tab)
  })
  const active = view.activeTab
  const mark = view.temporaryTab
  return {
    ...view,
    tabs,
    activeTab: active?.kind === 'skill' ? null : active,
    temporaryTab: mark?.kind === 'skill' ? null : mark,
    skillTabs,
    activeSkill: active?.kind === 'skill' ? identityOf(active) : null,
    temporarySkill: mark?.kind === 'skill' ? identityOf(mark) : null,
  }
}
