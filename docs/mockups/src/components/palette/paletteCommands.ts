import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  ArchiveRestore,
  ArrowDownToLine,
  Bot,
  Building2,
  FileDiff,
  Files,
  FolderGit2,
  FolderPlus,
  Globe,
  History,
  ListChecks,
  LogIn,
  MessageSquarePlus,
  Plus,
  Server,
  Settings2,
  SlidersHorizontal,
  SquareTerminal,
  Users,
} from 'lucide-react'
import { orgList, orgs, type Org } from '../../fixtures/orgs'
import { checksPaths, paths } from '../../paths'
import { orgLinks } from '../orgs/orgLinks'

/** What leads a command row: an icon, the tile of an org, or GitHub. */
export type CommandLead =
  | { kind: 'icon'; icon: LucideIcon }
  | { kind: 'org'; org: Org }
  | { kind: 'github' }

/**
 * An action or a setting of the palette. `words` are more words that a
 * search finds it by, which the row does not show. `to` is the screen that
 * running it shows, when the mockups draw one.
 */
export type Command = {
  label: string
  lead: CommandLead
  words?: readonly string[]
  to?: string
}

function icon(value: LucideIcon): CommandLead {
  return { kind: 'icon', icon: value }
}

const rightColumnActions: readonly Command[] = [
  { label: 'Go to All files', lead: icon(Files), to: paths.filesAll },
  { label: 'Go to Changes', lead: icon(FileDiff), to: paths.filesChanges },
  {
    label: 'Go to Checks',
    lead: icon(ListChecks),
    words: ['ci'],
    to: checksPaths['ready-to-merge'],
  },
  { label: 'Go to Terminal', lead: icon(SquareTerminal), to: paths.terminal },
  {
    label: 'Go to Preview',
    lead: icon(Globe),
    words: ['port'],
    to: paths.preview,
  },
]

/** What the open workspace offers to the person, for its actions. */
export type OpenActions = {
  /** The workspace is archived, so it has no new session and no lists. */
  archived: boolean
  /** The owner of the workspace and the admins of the org archive it. */
  archivable: boolean
  /** Every member restores it while the app keeps its cloud computer. */
  restorable: boolean
  /** The page shows the right column. */
  rightColumn: boolean
}

const sessionHistory: Command = {
  label: 'Session history',
  lead: icon(History),
  words: ['closed', 'reopen'],
  to: paths.sessionHistory,
}

/**
 * The actions of the open workspace: a new session, the session history,
 * each tab of the right column, and Archive. An archived workspace keeps
 * its session history and offers Restore.
 */
export function workspaceActions(open: OpenActions): Command[] {
  if (open.archived) {
    const restore: Command = {
      label: 'Restore workspace',
      lead: icon(ArchiveRestore),
      words: ['unarchive'],
      to: paths.restored,
    }
    return open.restorable ? [sessionHistory, restore] : [sessionHistory]
  }
  const actions: Command[] = [
    {
      label: 'New session',
      lead: icon(MessageSquarePlus),
      words: ['tab', 'agent', 'chat'],
      to: paths.sessions,
    },
    sessionHistory,
    ...(open.rightColumn ? rightColumnActions : []),
  ]
  if (!open.archivable) return actions
  return [
    ...actions,
    { label: 'Archive workspace', lead: icon(Archive), to: paths.justArchived },
  ]
}

/** The actions of the org: a new workspace and a new section. */
export const orgActions: readonly Command[] = [
  {
    label: 'New workspace',
    lead: icon(Plus),
    words: ['create', 'task'],
    to: paths.newWorkspace,
  },
  { label: 'New section', lead: icon(FolderPlus), words: ['group'] },
]

/**
 * The actions that only the window of the Mac app offers, because they
 * read the data of this Mac: the import of the local workspaces of
 * Conductor into the org, which asks before its first read.
 */
export const macActions: readonly Command[] = [
  {
    label: 'Import from Conductor',
    lead: icon(ArrowDownToLine),
    words: ['migrate', 'workspaces'],
    to: paths.macImportConsent,
  },
]

/** Create org, then a switch to each other org of the person. */
export const appActions: readonly Command[] = [
  {
    label: 'Create org',
    lead: icon(Building2),
    words: ['new', 'team'],
    to: paths.createOrg,
  },
  ...orgList
    .filter((org) => org.key !== 'acme')
    .map((org): Command => ({
      label: `Switch to ${org.name}`,
      lead: { kind: 'org', org },
      words: ['org'],
      to: orgLinks[org.key],
    })),
]

/** The tabs of the settings of Acme. */
export const orgSettings: readonly Command[] = [
  {
    label: 'General',
    lead: icon(Settings2),
    words: ['name', 'initials', 'delete org', 'leave org'],
    to: paths.orgSettings,
  },
  {
    label: 'Repositories',
    lead: icon(FolderGit2),
    words: ['github'],
    to: paths.repositories,
  },
  {
    label: 'Cloud computer',
    lead: icon(Server),
    words: ['install', 'startup script', 'env', 'build', 'sandbox'],
    to: paths.cloudComputer,
  },
  {
    label: 'Members',
    lead: icon(Users),
    words: ['invite', 'admin', 'role'],
    to: paths.members,
  },
]

/** The sections of the Account page, which every org shares. */
export const accountSettings: readonly Command[] = [
  {
    label: 'Sign-in',
    lead: icon(LogIn),
    words: ['sign out', 'account'],
    to: paths.account,
  },
  {
    label: 'GitHub',
    lead: { kind: 'github' },
    words: ['github app', 'install'],
    to: paths.account,
  },
  {
    label: 'Agents',
    lead: icon(Bot),
    words: ['claude', 'codex', 'login', 'api key'],
    to: paths.account,
  },
  {
    label: 'New workspaces',
    lead: icon(SlidersHorizontal),
    words: ['model', 'effort', 'default'],
    to: paths.accountPreferences,
  },
]

/** The name of the group of the settings of the current org. */
export const orgSettingsLabel = `${orgs.acme.name} settings`
