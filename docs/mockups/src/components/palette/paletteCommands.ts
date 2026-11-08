import type { LucideIcon } from 'lucide-react'
import {
  Archive,
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
  Monitor,
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

/**
 * The actions of the open workspace: a new session, the session history,
 * each tab of the right column, and Archive, which only the owner of the
 * workspace and the admins of the org see.
 */
export function workspaceActions(archivable: boolean): Command[] {
  const actions: Command[] = [
    {
      label: 'New session',
      lead: icon(MessageSquarePlus),
      words: ['tab', 'agent', 'chat'],
      to: paths.sessions,
    },
    {
      label: 'Session history',
      lead: icon(History),
      words: ['closed', 'reopen'],
      to: paths.sessionHistory,
    },
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
    { label: 'Go to Desktop', lead: icon(Monitor), to: paths.desktop },
  ]
  if (!archivable) return actions
  return [
    ...actions,
    { label: 'Archive workspace', lead: icon(Archive), to: paths.archive },
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
    to: paths.account,
  },
]

/** The name of the group of the settings of the current org. */
export const orgSettingsLabel = `${orgs.acme.name} settings`
