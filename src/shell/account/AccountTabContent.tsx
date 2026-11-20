import { useMemo } from 'react'
import type { Agent } from '../../shared/generated/Agent'
import type { AccountTab } from '../../app/router'
import { useServices } from '../../app/services'
import { ThisMacSection } from '../../chat/device/ThisMacSection'
import type { User } from '../../shared/api'
import { useMacApp } from '../mac/mac-app'
import { useViewport } from '../ui/viewport'
import { AgentsSection, SignInSection } from './AccountSections'
import { DeletedOrgsSection } from './DeletedOrgsSection'
import { FavouritesSection } from './FavouritesSection'
import { GitHubSection } from './GitHubSection'
import { InviteCodeSection } from './InviteCodeSection'
import { DefaultsSection } from './PreferencesSections'
import { ShortcutsTab } from './shortcuts/ShortcutsTab'
import { StatsTab } from './StatsTab'

/** The content of a tab of the account. */
function TabContent(props: {
  tab: AccountTab
  user: User
  connect: Agent | null
}) {
  switch (props.tab) {
    case 'general':
      return <GeneralTab user={props.user} />
    case 'agents':
      return <AgentsSection connect={props.connect} />
    case 'preferences':
      return (
        <>
          <FavouritesSection />
          <DefaultsSection />
        </>
      )
    case 'shortcuts':
      return <ShortcutsTab />
    case 'stats':
      return <StatsTab />
    case 'this-mac':
      return <ThisMac />
  }
}

/**
 * The This Mac tab, in the account of the Mac app only: the Mac that the
 * app registers, the commands that always run on it, and the permission grants of
 * each workspace. `AccountTabContent` shows the tab only in the Mac app, so a
 * browser sends no request to a Mac.
 */
function ThisMac() {
  const services = useServices()
  const clock = useMemo(() => ({ now: services.now }), [services])
  const viewport = useViewport()
  return (
    <ThisMacSection
      client={services.api}
      clock={clock}
      viewport={viewport === 'phone' ? 'mobile' : 'desktop'}
    />
  )
}

/**
 * The General tab: the GitHub sign-in, the GitHub App that every org
 * shares, and the invite code of the user. The deleted orgs of the user
 * come last, with Restore, only while one exists.
 */
function GeneralTab(props: { user: User }) {
  return (
    <>
      <SignInSection user={props.user} />
      <GitHubSection />
      <InviteCodeSection />
      <DeletedOrgsSection />
    </>
  )
}

/**
 * A tab of Account settings. General holds the GitHub sign-in, the GitHub
 * App, and the invite code of the user. Agents holds the logins of Claude
 * and Codex, which every org shares. `connect` opens the Connect form of an
 * agent at first, as the link of a missing login does. Preferences holds
 * the favourites of the model menu, then how new workspaces start: their
 * model, and how New workspace opens.
 * Keyboard shortcuts holds the keys of the commands. Stats holds the counts
 * of the person, which it reads each time that it opens. Only the Mac app
 * has This Mac, so a browser shows General at its address. The product is
 * free, so the tabs show no plan and no billing.
 */
export function AccountTabContent(props: {
  user: User
  tab: AccountTab
  connect: Agent | null
}) {
  const mac = useMacApp()
  const tab = props.tab === 'this-mac' && !mac ? 'general' : props.tab
  return <TabContent connect={props.connect} tab={tab} user={props.user} />
}
