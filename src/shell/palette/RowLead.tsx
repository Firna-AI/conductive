import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  ArchiveRestore,
  Bot,
  Building2,
  FileDiff,
  Files,
  FolderGit2,
  FolderPlus,
  Globe,
  History,
  Laptop,
  ListChecks,
  LogIn,
  MessageSquarePlus,
  Monitor,
  PanelLeft,
  Plus,
  Server,
  Settings2,
  SlidersHorizontal,
  SquareTerminal,
  Users,
} from 'lucide-react'
import { GitHubMark } from '../../../docs/mockups/src/components/common/GitHubMark'
import styles from '../../../docs/mockups/src/components/palette/CommandPalette.module.css'
import type {
  AccountSettingId,
  OfferedActionId,
  OwnActionId,
} from '../../app/palette/commands'
import type { CommandLead } from '../../app/palette/palette-rows'
import type { SettingsTab } from '../../app/router'
import { OrgTile } from '../ui/Avatars'

/** The icon of each action, as the mockups draw it. */
const actionIcons: Readonly<Record<OfferedActionId | OwnActionId, LucideIcon>> =
  {
    'new-session': MessageSquarePlus,
    'session-history': History,
    'go-to-all-files': Files,
    'go-to-changes': FileDiff,
    'go-to-checks': ListChecks,
    'go-to-terminal': SquareTerminal,
    'go-to-preview': Globe,
    'go-to-desktop': Monitor,
    'archive-workspace': Archive,
    'restore-workspace': ArchiveRestore,
    'new-section': FolderPlus,
    'hide-sidebar': PanelLeft,
    'show-sidebar': PanelLeft,
    'new-workspace': Plus,
    'create-org': Building2,
    'switch-org': Building2,
  }

const orgSettingIcons: Readonly<Record<SettingsTab, LucideIcon>> = {
  general: Settings2,
  repositories: FolderGit2,
  'cloud-computer': Server,
  members: Users,
}

/** The Account sections with an icon. GitHub shows the GitHub mark. */
const accountIcons: Readonly<
  Record<Exclude<AccountSettingId, 'github'>, LucideIcon>
> = {
  'sign-in': LogIn,
  agents: Bot,
  'new-workspaces': SlidersHorizontal,
  'this-mac': Laptop,
}

function Icon(props: { icon: LucideIcon }) {
  const Shape = props.icon
  return <Shape aria-hidden className={styles.icon} size={14} />
}

/** What leads a command row: its icon, the tile of an org, or GitHub. */
export function RowLead(props: { lead: CommandLead }) {
  const { lead } = props
  switch (lead.kind) {
    case 'action':
      return <Icon icon={actionIcons[lead.id]} />
    case 'org':
      return <OrgTile org={lead.org} size={16} />
    case 'org-setting':
      return <Icon icon={orgSettingIcons[lead.tab]} />
    case 'account':
      return lead.id === 'github' ? (
        <GitHubMark className={styles.icon} size={14} />
      ) : (
        <Icon icon={accountIcons[lead.id]} />
      )
  }
}
