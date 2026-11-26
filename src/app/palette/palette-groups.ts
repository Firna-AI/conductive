import type { Workspace } from '../../shared/generated/Workspace'
import { helpGroupLabel } from '../../ui/components/feedback/feedbackCopy'
import { queueLabels } from '../../ui/components/workspace/queueCopy'

import { queueBlocks } from '../merge-queue'
import { routes } from '../router'
import { groupWorkspaces } from '../sections'
import { valueOf } from '../store'
import { offeredActionIds, type OfferedActionId } from './commands'
import type { OfferedAction, PaletteOffer } from './page-actions'
import { switchCommand } from './palette-org'
import {
  accountLabel,
  accountRows,
  feedbackRow,
  linkRow,
  offeredRow,
  orgSettingRows,
  orgSettingsLabel,
  switchRow,
  workspaceRow,
  type PaletteGroup,
  type PaletteRow,
} from './palette-rows'
import type { PaletteBase, PaletteQuery, PaletteSource } from './palette-source'

const recentLimit = 5

/**
 * The workspaces of the org: by section in the order of the list, flat,
 * with each sub-workspace in the section that shows it, and archived. The
 * queued workspaces come first, as the Merge queue group of the list, in
 * the order of its blocks.
 */
interface OrgWorkspaces {
  sections: readonly { label: string; workspaces: readonly Workspace[] }[]
  archived: readonly Workspace[]
}

const noWorkspaces: OrgWorkspaces = { sections: [], archived: [] }

function orgWorkspaces(source: PaletteSource): OrgWorkspaces {
  if (source.org === null || source.list.state !== 'ready') {
    return noWorkspaces
  }
  const { sections, workspaces } = source.list.value
  const groups = groupWorkspaces(sections, workspaces, source.listTime)
  const repositories = (valueOf(source.repositories) ?? []).filter(
    (repository) => repository.selected,
  )
  const queued = queueBlocks(groups.queued, repositories).flatMap(
    (block) => block.entries,
  )
  return {
    sections: [
      ...(queued.length > 0
        ? [{ label: queueLabels.group, workspaces: queued }]
        : []),
      ...groups.sections.map((group) => ({
        label: group.section.name,
        workspaces: group.rows.map((row) => row.workspace),
      })),
    ],
    archived: groups.archived,
  }
}

/** Up to five active workspaces, the latest activity first, without the open one. */
function recent(workspaces: OrgWorkspaces, openId: string | null): Workspace[] {
  return workspaces.sections
    .flatMap((section) => section.workspaces)
    .filter((workspace) => workspace.id !== openId)
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, recentLimit)
}

/**
 * The name of the open workspace, and the offers of its parts, such as its
 * screen and its Terminal tool, in the order of their offers.
 */
function openWorkspace(source: PaletteBase): {
  name: string
  offers: PaletteOffer[]
} {
  const offers: PaletteOffer[] = []
  let name = ''
  for (const offer of source.offers) {
    const { scope } = offer
    if (scope.kind !== 'workspace') continue
    if (scope.workspaceId !== source.openWorkspaceId) continue
    if (offers.length === 0) name = scope.name
    offers.push(offer)
  }
  return { name, offers }
}

/** The rows of offered actions, in the order of the palette, each action once. */
function offeredRows(offers: readonly PaletteOffer[]): PaletteRow[] {
  const byId = new Map<OfferedActionId, OfferedAction>()
  for (const offer of offers) {
    for (const action of offer.actions) byId.set(action.id, action)
  }
  return offeredActionIds.flatMap((id) => {
    const action = byId.get(id)
    return action ? [offeredRow(action)] : []
  })
}

/**
 * The actions in their five parts: the open workspace, the org, the orgs,
 * the window, and help. The rows of the open workspace come from each part
 * that offers them, in the order of `offeredActionIds`. New workspace
 * shows wherever the org takes changes. Its row links to the page, and it
 * opens as the page or the dialog that the user chose. A deleted org has no
 * Switch to row. A Switch to row takes the command of the place of its org
 * in the rail, as `switchCommand` says. Send feedback shows on each page,
 * also without an org and in a suspended org, because feedback changes no
 * org.
 */
export function actionGroups(source: PaletteBase): PaletteGroup[] {
  const { org, offers } = source
  const workspace = openWorkspace(source)
  const orgRows: PaletteRow[] = []
  if (org && !source.suspended) {
    orgRows.push(linkRow('new-workspace', routes.newWorkspace(org.id)))
  }
  if (org) {
    const list = offers.filter(
      (offer) => offer.scope.kind === 'org' && offer.scope.orgId === org.id,
    )
    orgRows.push(...offeredRows(list))
  }
  const others = source.orgs.filter((other) => other.id !== org?.id)
  const window = offers.filter((offer) => offer.scope.kind === 'window')
  return [
    { label: workspace.name, rows: offeredRows(workspace.offers) },
    { label: org?.name ?? '', rows: orgRows },
    {
      label: 'Orgs',
      rows: [
        linkRow('create-org', source.createOrgHref),
        ...others.map((other) =>
          switchRow(
            other,
            switchCommand(source.orgs, other, org),
            source.orgHref(other.id),
          ),
        ),
      ],
    },
    { label: 'Window', rows: offeredRows(window) },
    { label: helpGroupLabel, rows: [feedbackRow()] },
  ]
}

/** The settings of the org, then the Account page, each in its group. */
export function settingGroups(
  source: PaletteBase,
  withDetail: boolean,
): PaletteGroup[] {
  const account = {
    label: accountLabel,
    rows: accountRows(source.mac, withDetail),
  }
  if (source.org === null) return [account]
  const org = {
    label: orgSettingsLabel(source.org),
    rows: orgSettingRows(source.org, withDetail),
  }
  return [org, account]
}

/** What a tab shows: the groups of a search, and the workspace groups. */
interface TabShows {
  searching: boolean
  /**
   * The data of the workspace groups loaded. Otherwise the status part
   * stands in their place, and the tab leaves them out.
   */
  workspaces: boolean
}

/** The groups of a tab before the search, in the order that they show. */
export function tabGroups(
  query: PaletteQuery,
  source: PaletteSource,
  shows: TabShows,
): PaletteGroup[] {
  const { searching } = shows
  const workspaces = shows.workspaces ? orgWorkspaces(source) : noWorkspaces
  const repositories = valueOf(source.repositories) ?? []
  const names = new Map(repositories.map((it) => [it.id, it.fullName]))
  const rows = (list: readonly Workspace[]) =>
    list.map((workspace) => workspaceRow(workspace, names))
  switch (query.tab) {
    case 'all': {
      const actions = actionGroups(source).flatMap((group) => group.rows)
      const settings = settingGroups(source, true).flatMap(
        (group) => group.rows,
      )
      const middle = [
        { label: 'Actions', rows: actions },
        { label: 'Settings', rows: settings },
      ]
      if (!searching) {
        const latest = recent(workspaces, source.openWorkspaceId)
        return [{ label: 'Recent workspaces', rows: rows(latest) }, ...middle]
      }
      const active = workspaces.sections.flatMap(
        (section) => section.workspaces,
      )
      return [
        { label: 'Workspaces', rows: rows(active) },
        ...middle,
        { label: 'Archived', rows: rows(workspaces.archived) },
      ]
    }
    case 'workspaces': {
      const { repositoryId } = query
      const shown = (list: readonly Workspace[]) =>
        rows(
          list.filter(
            (it) => repositoryId === null || it.repositoryId === repositoryId,
          ),
        )
      if (query.archived) {
        return [{ label: 'Archived', rows: shown(workspaces.archived) }]
      }
      return workspaces.sections.map((section) => ({
        label: section.label,
        rows: shown(section.workspaces),
      }))
    }
    case 'actions':
      return actionGroups(source)
    case 'settings':
      return settingGroups(source, searching)
  }
}
