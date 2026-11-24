import { isSkillName, type SkillIdentity } from '../../src/shared/skills'
import type {
  SkillTabPlace,
  WorkspaceView,
} from '../../src/shared/workspace-view'
import { natural } from '../files/parsers'
import { isRecord } from '../http'

function skillIdentity(value: unknown): SkillIdentity | null {
  if (!isRecord(value)) return null
  const { agent, name } = value
  return (agent === 'claude' || agent === 'codex') &&
    typeof name === 'string' &&
    isSkillName(name)
    ? { agent, name }
    : null
}

function skillPlaces(value: unknown): SkillTabPlace[] | null {
  if (!Array.isArray(value)) return null
  const places: SkillTabPlace[] = []
  for (const tab of value) {
    if (!isRecord(tab) || !natural(tab.place)) return null
    const identity = skillIdentity(tab)
    if (!identity) return null
    places.push({ ...identity, place: tab.place })
  }
  return places
}

function sameSkill(left: SkillIdentity, right: SkillIdentity): boolean {
  return left.agent === right.agent && left.name === right.name
}

function openSkill(
  value: unknown,
  tabs: readonly SkillTabPlace[],
): SkillIdentity | null {
  const skill = skillIdentity(value)
  return skill && tabs.some((tab) => sameSkill(tab, skill)) ? skill : null
}

function placedSkills(
  places: readonly SkillTabPlace[],
  baseCount: number,
  closed: SkillIdentity | null,
): SkillTabPlace[] {
  const tabs: SkillTabPlace[] = []
  const ordered = [...places].sort((left, right) => left.place - right.place)
  const removedPlace = closed
    ? ordered.find((tab) => sameSkill(tab, closed))?.place
    : undefined
  const opened = new Set<string>()
  let nextPlace = 0
  for (const tab of ordered) {
    const key = JSON.stringify([tab.agent, tab.name])
    if (opened.has(key) || (closed && sameSkill(tab, closed))) continue
    const desired =
      removedPlace !== undefined && tab.place > removedPlace
        ? tab.place - 1
        : tab.place
    const place = Math.min(
      Math.max(nextPlace, desired),
      baseCount + tabs.length,
    )
    tabs.push({ ...tab, place })
    opened.add(key)
    nextPlace = place + 1
  }
  return tabs
}

export function withWorkspaceSkills(
  base: WorkspaceView,
  input: Record<string, unknown>,
  stored?: WorkspaceView,
): WorkspaceView | null {
  const olderApp = input.skillTabs === undefined
  const places = olderApp
    ? (stored?.skillTabs ?? [])
    : skillPlaces(input.skillTabs)
  if (!places) return null
  const temporary = openSkill(
    olderApp ? stored?.temporarySkill : input.temporarySkill,
    places,
  )
  const closed = olderApp && base.temporaryTab ? temporary : null
  const skillTabs = placedSkills(places, base.tabs.length, closed)
  if (!skillTabs.length) return base
  return {
    ...base,
    skillTabs,
    activeSkill: base.activeTab
      ? null
      : openSkill(
          olderApp ? stored?.activeSkill : input.activeSkill,
          skillTabs,
        ),
    temporarySkill: base.temporaryTab ? null : temporary,
  }
}
