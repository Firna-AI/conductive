import { sectionPath, sectionsPath, type Section } from '../shared/sections'
import { workspacePath } from '../shared/workspaces'
import { ignore, nested, record } from './api/parse'
import { readSection } from './api/read-core'
import { readWorkspaceResponse } from './api/read-workspaces'
import {
  sectionAdded,
  sectionCollapsed,
  sectionDeleted,
  sectionRenamed,
  workspaceMoved,
} from './list-changes'
import type { OrgModel } from './org-model'
import { same } from './resource'

/*
 * The writes of the list. A collapse, a delete, and a move show at once,
 * and a create and a rename show their answer. Each write keeps its change
 * apart from the list that the server confirmed: a failure takes back only
 * that change, and an answer confirms only the fields of its write.
 */

const readSectionResponse = (body: unknown) =>
  nested(record(body), 'section', readSection)

export function createSection(org: OrgModel, name: string): Promise<Section> {
  return org.resources.list.write(
    same,
    () =>
      org.services.api.send(
        'POST',
        sectionsPath(org.orgId),
        { name },
        readSectionResponse,
      ),
    sectionAdded,
  )
}

export async function renameSection(
  org: OrgModel,
  sectionId: string,
  name: string,
): Promise<void> {
  await org.resources.list.write(
    same,
    () =>
      org.services.api.send(
        'PATCH',
        sectionPath(org.orgId, sectionId),
        { name },
        readSectionResponse,
      ),
    (section) => sectionRenamed(section.id, section.name),
  )
}

export async function setSectionCollapsed(
  org: OrgModel,
  sectionId: string,
  collapsed: boolean,
): Promise<void> {
  await org.resources.list.write(
    sectionCollapsed(sectionId, collapsed),
    () =>
      org.services.api.send(
        'PATCH',
        sectionPath(org.orgId, sectionId),
        { collapsed },
        readSectionResponse,
      ),
    (section) => sectionCollapsed(section.id, section.collapsed),
  )
}

/** Deletes a section. Its workspaces move to General, so nothing is lost. */
export async function deleteSection(
  org: OrgModel,
  sectionId: string,
): Promise<void> {
  await org.resources.list.write(
    sectionDeleted(sectionId),
    () =>
      org.services.api.send(
        'DELETE',
        sectionPath(org.orgId, sectionId),
        {},
        ignore,
      ),
    () => sectionDeleted(sectionId),
  )
}

/**
 * Moves a workspace to `index` of a section, as a drop does. The index
 * counts the workspaces of that section without the moved one. The answer
 * confirms the section only: its record of the workspace can be older than
 * an event, so the state of the workspace stays as the list has it.
 */
export async function moveToSection(
  org: OrgModel,
  workspaceId: string,
  sectionId: string,
  index: number,
): Promise<void> {
  await org.resources.list.write(
    workspaceMoved(workspaceId, sectionId, index),
    () =>
      org.services.api.send(
        'PATCH',
        workspacePath(org.orgId, workspaceId),
        { sectionId, position: index },
        readWorkspaceResponse,
      ),
    (detail) => workspaceMoved(workspaceId, detail.workspace.sectionId, index),
  )
}
