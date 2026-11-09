import type { OrgSummary } from '../../shared/orgs'
import type { Workspace } from '../../shared/workspaces'
import { routes, type SettingsTab } from '../router'
import {
  accountSettingIds,
  accountSettings,
  actionTexts,
  orgSettings,
  type AccountSettingId,
  type OfferedActionId,
  type OwnActionId,
} from './commands'
import type { OfferedAction } from './page-actions'
import { nameLabel } from '../../shared/name-label'

/** A workspace of the org. It opens the workspace. */
export interface WorkspaceRow {
  readonly kind: 'workspace'
  readonly key: string
  readonly workspace: Workspace
  /** The repository of the workspace, or empty while it is unknown. */
  readonly repository: string
  readonly href: string
}

/** What leads a command row: the icon of an action or a setting, or an org. */
export type CommandLead =
  | { readonly kind: 'action'; readonly id: OfferedActionId | OwnActionId }
  | { readonly kind: 'org'; readonly org: OrgSummary }
  | { readonly kind: 'org-setting'; readonly tab: SettingsTab }
  | { readonly kind: 'account'; readonly id: AccountSettingId }

/**
 * An action or a setting. A row with `href` is a link to a page. A plain
 * click and Enter run `run` when the row has one, and open `href` when not.
 */
export interface CommandRow {
  readonly kind: 'command'
  readonly key: string
  readonly lead: CommandLead
  readonly label: string
  readonly words: readonly string[]
  /** The page that holds a setting, in a list of several kinds. */
  readonly detail?: string
  readonly href?: string
  readonly run?: () => void
}

export type PaletteRow = WorkspaceRow | CommandRow

export interface PaletteGroup {
  readonly label: string
  readonly rows: readonly PaletteRow[]
}

/** The texts that a search looks at in a row. */
export function rowTexts(row: PaletteRow): readonly string[] {
  if (row.kind === 'workspace') {
    const { workspace } = row
    return [nameLabel(workspace.name), workspace.branch, row.repository]
  }
  return [row.label, ...row.words]
}

/** The names of the repositories of the org, by their ID. */
export type RepositoryNames = ReadonlyMap<string, string>

export function workspaceRow(
  workspace: Workspace,
  names: RepositoryNames,
): WorkspaceRow {
  return {
    kind: 'workspace',
    key: `workspace:${workspace.id}`,
    workspace,
    repository: names.get(workspace.repositoryId) ?? '',
    href: routes.workspace(workspace.orgId, workspace.id),
  }
}

/** The row of an action that a part of the page offers. */
export function offeredRow(action: OfferedAction): CommandRow {
  const text = actionTexts[action.id]
  return {
    kind: 'command',
    key: `action:${action.id}`,
    lead: { kind: 'action', id: action.id },
    label: text.label,
    words: text.words,
    href: action.href,
    run: action.run,
  }
}

/** An action of the palette itself, which opens a page. */
export function linkRow(id: OwnActionId, href: string): CommandRow {
  const text = actionTexts[id]
  return {
    kind: 'command',
    key: `action:${id}`,
    lead: { kind: 'action', id },
    label: text.label,
    words: text.words,
    href,
  }
}

/** Switch to another org of the person. It opens the list of the org. */
export function switchRow(org: OrgSummary): CommandRow {
  const text = actionTexts['switch-org']
  return {
    kind: 'command',
    key: `switch:${org.id}`,
    lead: { kind: 'org', org },
    label: `${text.label} ${org.name}`,
    words: text.words,
    href: routes.org(org.id),
  }
}

/** The name of the group of the settings of an org, such as "Acme settings". */
export function orgSettingsLabel(org: OrgSummary): string {
  return `${org.name} settings`
}

/** The label of the group of the sections of the Account page. */
export const accountLabel = 'Account'

/** The tabs of the settings of an org. Each row opens its tab. */
export function orgSettingRows(
  org: OrgSummary,
  withDetail: boolean,
): CommandRow[] {
  return orgSettings.map((setting) => ({
    kind: 'command',
    key: `setting:${setting.tab}`,
    lead: { kind: 'org-setting', tab: setting.tab },
    label: setting.label,
    words: setting.words,
    detail: withDetail ? orgSettingsLabel(org) : undefined,
    href: routes.settings(org.id, setting.tab),
  }))
}

/** The sections of the Account page. Each row opens the Account page. */
export function accountRows(mac: boolean, withDetail: boolean): CommandRow[] {
  return accountSettingIds
    .filter((id) => mac || id !== 'this-mac')
    .map((id) => ({
      kind: 'command',
      key: `account:${id}`,
      lead: { kind: 'account', id },
      label: accountSettings[id].label,
      words: accountSettings[id].words,
      detail: withDetail ? accountLabel : undefined,
      href: routes.account(),
    }))
}
