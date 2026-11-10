import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  ArchiveRestore,
  Building2,
  FileDiff,
  Files,
  FolderPlus,
  Globe,
  History,
  ListChecks,
  MessageSquarePlus,
  Plus,
  SquareTerminal,
} from 'lucide-react'
import { orgList, type Org } from '../../fixtures/orgs'
import { orgCommand, type CommandId } from '../../fixtures/shortcutCommands'
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
 * running it shows, when the mockups draw one. `shortcut` is the command of
 * the Keyboard shortcuts tab, whose key the row can show.
 */
export type Command = {
  label: string
  lead: CommandLead
  words?: readonly string[]
  to?: string
  shortcut?: CommandId
}

export function icon(value: LucideIcon): CommandLead {
  return { kind: 'icon', icon: value }
}

const rightColumnActions: readonly Command[] = [
  {
    label: 'Go to All files',
    lead: icon(Files),
    to: paths.filesAll,
    shortcut: 'go-to-all-files',
  },
  {
    label: 'Go to Changes',
    lead: icon(FileDiff),
    to: paths.filesChanges,
    shortcut: 'go-to-changes',
  },
  {
    label: 'Go to Checks',
    lead: icon(ListChecks),
    words: ['ci'],
    to: checksPaths['ready-to-merge'],
    shortcut: 'go-to-checks',
  },
  {
    label: 'Go to Terminal',
    lead: icon(SquareTerminal),
    to: paths.terminal,
    shortcut: 'go-to-terminal',
  },
  {
    label: 'Go to Preview',
    lead: icon(Globe),
    words: ['port'],
    to: paths.preview,
    shortcut: 'go-to-preview',
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
  shortcut: 'session-history',
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
      shortcut: 'new-session',
    },
    sessionHistory,
    ...(open.rightColumn ? rightColumnActions : []),
  ]
  if (!open.archivable) return actions
  return [
    ...actions,
    {
      label: 'Archive workspace',
      lead: icon(Archive),
      to: paths.justArchived,
      shortcut: 'archive-workspace',
    },
  ]
}

/** The actions of the org: a new workspace and a new section. */
export const orgActions: readonly Command[] = [
  {
    label: 'New workspace',
    lead: icon(Plus),
    words: ['create', 'task'],
    to: paths.newWorkspace,
    shortcut: 'new-workspace',
  },
  {
    label: 'New section',
    lead: icon(FolderPlus),
    words: ['group'],
    shortcut: 'new-section',
  },
]

/**
 * Create org, then a switch to each other org of the person. The switch
 * names the place of the org in the rail, whose key it can show.
 */
export const appActions: readonly Command[] = [
  {
    label: 'Create org',
    lead: icon(Building2),
    words: ['new', 'team'],
    to: paths.createOrg,
    shortcut: 'create-org',
  },
  ...orgList.flatMap((org, index): Command[] =>
    org.key === 'acme'
      ? []
      : [
          {
            label: `Switch to ${org.name}`,
            lead: { kind: 'org', org },
            words: ['org'],
            to: orgLinks[org.key],
            shortcut: orgCommand(index),
          },
        ],
  ),
]
