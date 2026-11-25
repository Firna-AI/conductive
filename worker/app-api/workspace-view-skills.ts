import { isSkillName, type SkillIdentity } from '../../src/shared/skills'
import type {
  SkillTabPlace,
  WorkspaceTab,
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
  const opened = new Set<string>()
  return places
    .sort((left, right) => left.place - right.place)
    .filter((tab) => {
      const key = JSON.stringify([tab.agent, tab.name])
      if (opened.has(key)) return false
      opened.add(key)
      return true
    })
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

function tabKey(tab: WorkspaceTab): string {
  switch (tab.kind) {
    case 'session':
      return `session:${tab.sessionId}`
    case 'preview':
      return `preview:${tab.port}`
    case 'skill':
      return `skill:${tab.agent}/${tab.name}`
    default:
      return `${tab.kind}:${tab.path}`
  }
}

function tabOccurrences(
  tabs: readonly (WorkspaceTab | null)[],
): (string | null)[] {
  const seen = new Map<string, number>()
  return tabs.map((tab) => {
    if (tab === null) return null
    const key = tabKey(tab)
    const occurrence = seen.get(key) ?? 0
    seen.set(key, occurrence + 1)
    return JSON.stringify([key, occurrence])
  })
}

function rebuildSkillPlaces(
  skills: readonly SkillTabPlace[],
  savedTabs: readonly (WorkspaceTab | null)[],
  openTabs: readonly WorkspaceTab[],
): SkillTabPlace[] {
  const openPlaces = new Map(
    tabOccurrences(openTabs).map((tab, index) => [tab, index]),
  )
  const survivingPlaces = tabOccurrences(savedTabs).map((tab) =>
    openPlaces.get(tab),
  )
  const firstSurvivor = survivingPlaces.find((place) => place !== undefined)
  let savedSlot = 0
  let nextSavedTab = 0
  let precedingTab: number | undefined
  let openSlot = 0
  return skills.map((tab, index) => {
    // Each earlier skill occupies one place in the saved row.
    savedSlot = Math.min(
      Math.max(savedSlot, tab.place - index),
      savedTabs.length,
    )
    while (nextSavedTab < savedSlot) {
      precedingTab = survivingPlaces[nextSavedTab] ?? precedingTab
      nextSavedTab += 1
    }
    const slot =
      precedingTab === undefined
        ? (firstSurvivor ?? savedSlot)
        : precedingTab + 1
    openSlot = Math.min(Math.max(openSlot, slot), openTabs.length)
    return { ...tab, place: openSlot + index }
  })
}

export function workspaceSkillPatch(
  input: Record<string, unknown>,
): Pick<WorkspaceView, 'skillTabs' | 'activeSkill' | 'temporarySkill'> | null {
  if (input.skillTabs === undefined) return {}
  const places = skillPlaces(input.skillTabs)
  if (!places) return null
  return {
    skillTabs: places,
    activeSkill: openSkill(input.activeSkill, places),
    temporarySkill: openSkill(input.temporarySkill, places),
  }
}

export function withWorkspaceSkills(
  base: WorkspaceView,
  input: Record<string, unknown>,
  savedTabs: readonly (WorkspaceTab | null)[],
): WorkspaceView | null {
  const skills = workspaceSkillPatch(input)
  if (!skills) return null
  if (!skills.skillTabs?.length) return base
  return {
    ...base,
    skillTabs: rebuildSkillPlaces(skills.skillTabs, savedTabs, base.tabs),
    activeSkill: base.activeTab ? null : (skills.activeSkill ?? null),
    temporarySkill: base.temporaryTab ? null : (skills.temporarySkill ?? null),
  }
}
