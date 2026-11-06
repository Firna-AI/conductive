import { sectionPath, sectionsPath, type Section } from '../shared/sections'
import { workspacePath } from '../shared/workspaces'
import { ignore, nested, record } from './api/parse'
import { readSection } from './api/read-core'
import { readWorkspaceResponse } from './api/read-workspaces'
import type { OrgModel } from './org-model'
import { moveWorkspace, withoutSection } from './sections'
import { patch, valueOf } from './store'

const readSectionResponse = (body: unknown) =>
  nested(record(body), 'section', readSection)

function putSection(org: OrgModel, section: Section): void {
  patch(org.sections, (sections) =>
    sections.some((item) => item.id === section.id)
      ? sections.map((item) => (item.id === section.id ? section : item))
      : [...sections, section],
  )
}

/** Runs a write after a change to the list, and undoes the change if it fails. */
async function withUndo<T>(
  org: OrgModel,
  change: () => void,
  write: () => Promise<T>,
): Promise<T> {
  const sections = org.sections.get()
  const workspaces = org.workspaces.get()
  change()
  try {
    return await write()
  } catch (error) {
    org.sections.set(sections)
    org.workspaces.set(workspaces)
    throw error
  }
}

export async function createSection(
  org: OrgModel,
  name: string,
): Promise<Section> {
  const section = await org.services.api.send(
    'POST',
    sectionsPath(org.orgId),
    { name },
    readSectionResponse,
  )
  putSection(org, section)
  return section
}

export async function renameSection(
  org: OrgModel,
  sectionId: string,
  name: string,
): Promise<void> {
  putSection(
    org,
    await org.services.api.send(
      'PATCH',
      sectionPath(org.orgId, sectionId),
      { name },
      readSectionResponse,
    ),
  )
}

export async function setSectionCollapsed(
  org: OrgModel,
  sectionId: string,
  collapsed: boolean,
): Promise<void> {
  const section = await withUndo(
    org,
    () =>
      patch(org.sections, (sections) =>
        sections.map((item) =>
          item.id === sectionId ? { ...item, collapsed } : item,
        ),
      ),
    () =>
      org.services.api.send(
        'PATCH',
        sectionPath(org.orgId, sectionId),
        { collapsed },
        readSectionResponse,
      ),
  )
  putSection(org, section)
}

/** Deletes a section. Its workspaces move to General, so nothing is lost. */
export async function deleteSection(
  org: OrgModel,
  sectionId: string,
): Promise<void> {
  await withUndo(
    org,
    () => {
      const sections = valueOf(org.sections.get())
      const workspaces = valueOf(org.workspaces.get())
      if (!sections || !workspaces) return
      const next = withoutSection(sections, workspaces, sectionId)
      patch(org.sections, () => next.sections)
      patch(org.workspaces, () => next.workspaces)
    },
    () =>
      org.services.api.send(
        'DELETE',
        sectionPath(org.orgId, sectionId),
        {},
        ignore,
      ),
  )
}

/**
 * Moves a workspace to `index` of a section, as a drop does. The index
 * counts the workspaces of that section without the moved one.
 */
export async function moveToSection(
  org: OrgModel,
  workspaceId: string,
  sectionId: string,
  index: number,
): Promise<void> {
  const sections = valueOf(org.sections.get()) ?? []
  const detail = await withUndo(
    org,
    () =>
      patch(org.workspaces, (list) =>
        moveWorkspace(list, sections, workspaceId, sectionId, index),
      ),
    () =>
      org.services.api.send(
        'PATCH',
        workspacePath(org.orgId, workspaceId),
        { sectionId, position: index },
        readWorkspaceResponse,
      ),
  )
  org.putWorkspace(detail.workspace)
}
