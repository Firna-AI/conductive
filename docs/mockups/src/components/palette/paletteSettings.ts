import {
  Bot,
  FolderGit2,
  Keyboard,
  Laptop,
  LogIn,
  Server,
  Settings2,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { orgs } from '../../fixtures/orgs'
import type { ShortcutChanges } from '../../fixtures/shortcutChanges'
import { paths } from '../../paths'
import { icon, type Command } from './paletteCommands'

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
    shortcut: 'repositories-settings',
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

/** The name of the group of the settings of the current org. */
export const orgSettingsLabel = `${orgs.acme.name} settings`

/** The This Mac section, which only the Mac app has. */
const thisMacSetting: Command = {
  label: 'This Mac',
  lead: icon(Laptop),
  words: ['device', 'always allow', 'commands'],
  to: paths.thisMac,
}

/** GitHub and Agents, which follow Sign-in on the General tab. */
const generalSettings: readonly Command[] = [
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
]

/**
 * The Keyboard shortcuts tab. Only the Mac app has it until decisions 192
 * and 194 set the keys of a browser.
 */
const shortcutsSetting: Command = {
  label: 'Keyboard shortcuts',
  lead: icon(Keyboard),
  words: ['keys', 'hotkeys', 'keybindings'],
  to: paths.macShortcuts,
  shortcut: 'keyboard-shortcuts',
}

/**
 * The sections of the Account page, which every org shares, in the order
 * of its tabs. The Mac app adds This Mac after Sign-in, and the person's
 * shortcuts add their tab at the end.
 */
export function accountSettings(place: {
  mac?: boolean
  shortcuts?: ShortcutChanges
}): Command[] {
  return [
    {
      label: 'Sign-in',
      lead: icon(LogIn),
      words: ['sign out', 'account'],
      to: paths.account,
    },
    ...(place.mac ? [thisMacSetting] : []),
    ...generalSettings,
    {
      label: 'New workspaces',
      lead: icon(SlidersHorizontal),
      words: ['model', 'effort', 'default'],
      to: paths.accountPreferences,
    },
    ...(place.shortcuts ? [shortcutsSetting] : []),
  ]
}
