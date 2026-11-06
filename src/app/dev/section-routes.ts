import {
  sectionPath,
  sectionsPath,
  type Section,
  type SectionResponse,
  type SectionsResponse,
} from '../../shared/sections'
import { count, flag, record } from '../api/parse'
import { withoutSection } from '../sections'
import { requireOrg, requireSection, type DevBackend } from './backend'
import {
  ID,
  json,
  noContent,
  optional,
  requiredText,
  type Params,
  type Route,
} from './router'
import { slugify, uniqueId, type OrgState } from './state'

function sectionReply(section: Section, status = 200): Response {
  return json({ section } satisfies SectionResponse, status)
}

/** The sections in their order, with positions that count from 0. */
function numbered(sections: readonly Section[]): Section[] {
  return sections.map((section, position) => ({ ...section, position }))
}

/** A new section goes at the end of the list, open. */
function createSection(org: OrgState, body: unknown): Response {
  const name = requiredText(record(body), 'name')
  const section: Section = {
    id: uniqueId(
      slugify(name, 'section'),
      org.sections.map((item) => item.id),
    ),
    orgId: org.org.id,
    name,
    position: org.sections.length,
    isDefault: false,
    collapsed: false,
  }
  org.sections = [...org.sections, section]
  return sectionReply(section, 201)
}

/** Rename, collapse, and move. A move puts the section at `position`. */
function updateSection(
  org: OrgState,
  sectionId: string,
  body: unknown,
): Response {
  const fields = record(body)
  const name = optional(fields, 'name', requiredText)
  const collapsed = optional(fields, 'collapsed', flag)
  const position = optional(fields, 'position', count)
  const current = requireSection(org, sectionId)
  const section: Section = {
    ...current,
    name: name ?? current.name,
    collapsed: collapsed ?? current.collapsed,
  }
  const rest = org.sections.filter((item) => item.id !== sectionId)
  const at =
    position === undefined
      ? org.sections.indexOf(current)
      : Math.min(Math.max(0, Math.round(position)), rest.length)
  org.sections = numbered([...rest.slice(0, at), section, ...rest.slice(at)])
  return sectionReply(requireSection(org, sectionId))
}

/** Delete section. Its workspaces move to the default section, General. */
function deleteSection(
  backend: DevBackend,
  org: OrgState,
  sectionId: string,
): Response {
  requireSection(org, sectionId)
  const moved = org.workspaces
    .filter((workspace) => workspace.sectionId === sectionId)
    .map((workspace) => workspace.id)
  const next = withoutSection(org.sections, org.workspaces, sectionId)
  org.sections = numbered(next.sections)
  org.workspaces = next.workspaces
  for (const workspace of next.workspaces) {
    if (!moved.includes(workspace.id)) continue
    backend.emit(workspace.id, { type: 'workspace.updated', workspace })
  }
  return noContent()
}

export function sectionRoutes(backend: DevBackend): Route[] {
  const orgOf = (params: Params) => requireOrg(backend.state, params.org)
  return [
    {
      method: 'GET',
      path: sectionsPath(ID.org),
      answer: ({ params }) =>
        json({ sections: orgOf(params).sections } satisfies SectionsResponse),
    },
    {
      method: 'POST',
      path: sectionsPath(ID.org),
      answer: ({ params, body }) => createSection(orgOf(params), body),
    },
    {
      method: 'PATCH',
      path: sectionPath(ID.org, ID.section),
      answer: ({ params, body }) =>
        updateSection(orgOf(params), params.section, body),
    },
    {
      method: 'DELETE',
      path: sectionPath(ID.org, ID.section),
      answer: ({ params }) =>
        deleteSection(backend, orgOf(params), params.section),
    },
  ]
}
