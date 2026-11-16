import type { Workspace } from './generated/Workspace'
import type { Section } from './sections'

export const MAX_WORKSPACE_DEPTH = 3

export type TreeWorkspace = Pick<
  Workspace,
  'id' | 'parentId' | 'sectionId' | 'state' | 'createdAt'
>

export interface WorkspacePlacement<T extends TreeWorkspace> {
  workspace: T
  sectionId: string
  parentId: string | null
  depth: number
}

/**
 * Input keeps the existing places of top-level rows, including archived rows.
 * Output contains live rows with their shown section, parent, and depth.
 */
export function placeWorkspaces<T extends TreeWorkspace>(
  workspaces: readonly T[],
  sections: readonly Pick<Section, 'id' | 'position' | 'isDefault'>[],
): WorkspacePlacement<T>[] {
  const orderedSections = [...sections].sort((a, b) => a.position - b.position)
  const sectionIds = new Set(sections.map(({ id }) => id))
  const fallback =
    sections.find((section) => section.isDefault) ?? orderedSections[0]
  const ids = new Set(workspaces.map(({ id }) => id))
  const children = new Map<string, T[]>()
  const roots: T[] = []
  for (const workspace of workspaces) {
    if (workspace.parentId === null || !ids.has(workspace.parentId)) {
      roots.push(workspace)
    } else {
      const siblings = children.get(workspace.parentId) ?? []
      siblings.push(workspace)
      children.set(workspace.parentId, siblings)
    }
  }
  for (const siblings of children.values()) {
    siblings.sort(
      (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
    )
  }
  const rows: WorkspacePlacement<T>[] = []
  function visit(workspace: T, parent: WorkspacePlacement<T> | null) {
    let shown = parent
    if (workspace.state !== 'archived') {
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
