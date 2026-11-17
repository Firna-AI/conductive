import { listedWorkspaces, type ArchiveTime } from '../app/workspace-removal'
import type { OrgRole } from '../shared/api'

/** The fields of a person that the members UI shows. */
export type PersonName = {
  githubLogin: string
  displayName: string | null
}

export const roleLabels: Readonly<Record<OrgRole, string>> = {
  admin: 'Admin',
  member: 'Member',
}

/** The roles in the order of the role menu. */
export const roleOrder: readonly OrgRole[] = ['admin', 'member']

/** The name to show: the display name, or the GitHub login without one. */
export function personName(person: PersonName): string {
  const name = person.displayName?.trim()
  return name ? name : person.githubLogin
}

/** The first word of the name, as a sentence uses it. */
export function firstName(person: PersonName): string {
  return personName(person).split(/\s+/)[0]
}

/** Up to two letters for an avatar: the first letters of two words. */
export function initials(person: PersonName): string {
  const words = personName(person).split(/\s+/).filter(Boolean)
  const letters = words.slice(0, 2).map((word) => word.charAt(0))
  return letters.join('').toUpperCase()
}

/** A workspace as the member counts read it: its owner and its Archive. */
export type OwnedWorkspace = ArchiveTime & { owner: { id: string } }

/**
 * The number of workspaces of each owner that the list shows at `now`, by
 * user ID. A removed workspace leaves the list, so no count holds it.
 */
export function countOwners(
  workspaces: readonly OwnedWorkspace[],
  now: number,
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const workspace of listedWorkspaces(workspaces, now)) {
    counts[workspace.owner.id] = (counts[workspace.owner.id] ?? 0) + 1
  }
  return counts
}

/** "1 workspace", "2 workspaces". */
export function workspaceCount(total: number): string {
  return `${total} ${total === 1 ? 'workspace' : 'workspaces'}`
}
