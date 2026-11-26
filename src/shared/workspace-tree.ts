import type { Workspace } from './generated/Workspace'
import type { Section } from './sections'

export const MAX_WORKSPACE_DEPTH = 3

export type TreeWorkspace = Pick<
  Workspace,
  'id' | 'parentId' | 'sectionId' | 'state' | 'createdAt' | 'mergeQueue'
>

export interface WorkspacePlacement<T extends TreeWorkspace> {
  workspace: T
  sectionId: string
  parentId: string | null
  depth: number
}

/**
 * Whether a workspace shows in no section: an archived one shows in the
 * Archived group, and a queued one in the Merge queue group (decision
 * 318). Its live sub-workspaces show under the nearest workspace above
 * them that shows in a section.
 */
export function leavesSection(workspace: TreeWorkspace): boolean {
  return workspace.state === 'archived' || workspace.mergeQueue !== undefined
}

/**
 * Input keeps the existing places of top-level rows, including archived and
 * queued rows. Output contains the rows of the sections: the live
 * workspaces that are not queued, with their shown section, parent, and
 * depth.
 */
export function placeWorkspaces<T extends TreeWorkspace>(
  workspaces: readonly T[],
  sections: readonly Pick<Section, 'id' | 'position' | 'isDefault'>[],
): WorkspacePlacement<T>[] {
  const orderedSections = [...sections].sort((a, b) => a.position - b.position)
  const sectionIds = new Set(sections.map(({ id }) => id))
  const fallback =
    sections.find((section) => section.isDefault) ?? orderedSections[0]
  const byId = new Map(workspaces.map((workspace) => [workspace.id, workspace]))
  const children = new Map<string, T[]>()
  const roots: T[] = []
  for (const workspace of workspaces) {
    if (workspace.parentId !== null && byId.has(workspace.parentId)) {
      const siblings = children.get(workspace.parentId) ?? []
      siblings.push(workspace)
      children.set(workspace.parentId, siblings)
    }
    if (leavesSection(workspace)) continue
    let ancestor = byId.get(workspace.parentId ?? '')
    const seen = new Set([workspace.id])
    while (ancestor && leavesSection(ancestor) && !seen.has(ancestor.id)) {
      seen.add(ancestor.id)
      ancestor = byId.get(ancestor.parentId ?? '')
    }
    if (ancestor && seen.has(ancestor.id)) ancestor = undefined
    if (!ancestor) roots.push(workspace)
  }
  for (const siblings of children.values()) {
    siblings.sort(
      (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
    )
  }
  const rows: WorkspacePlacement<T>[] = []
  const visited = new Set<string>()
  function visit(workspace: T, parent: WorkspacePlacement<T> | null) {
    if (visited.has(workspace.id)) return
    visited.add(workspace.id)
    let shown = parent
    if (!leavesSection(workspace)) {
      shown = {
        workspace,
        sectionId:
          parent?.sectionId ??
          (sectionIds.has(workspace.sectionId)
            ? workspace.sectionId
            : (fallback?.id ?? workspace.sectionId)),
        parentId: parent?.workspace.id ?? null,
        depth: parent === null ? 0 : parent.depth + 1,
      }
      rows.push(shown)
    }
    for (const child of children.get(workspace.id) ?? []) visit(child, shown)
  }
  for (const root of roots) visit(root, null)
  const sectionOrder = new Map(
    orderedSections.map(({ id }, index) => [id, index]),
  )
  return rows.sort(
    (a, b) =>
      (sectionOrder.get(a.sectionId) ?? 0) -
      (sectionOrder.get(b.sectionId) ?? 0),
  )
}
