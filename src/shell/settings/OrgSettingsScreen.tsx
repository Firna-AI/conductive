import { routes, type SettingsTab } from '../../app/router'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { Page } from '../layout/Page'
import { LinkTabs } from '../ui/links'
import { useViewport } from '../ui/viewport'
import { BoatKeyTab } from './BoatKeyTab'
import { ComputerTab } from './ComputerTab'
import { GeneralTab } from './GeneralTab'
import { MembersTab } from './MembersTab'
import { RepositoriesTab } from './RepositoriesTab'

/** The parts of the org settings, in their order. */
const tabs = [
  { tab: 'general', label: 'General', adminOnly: false },
  { tab: 'repositories', label: 'Repositories', adminOnly: false },
  { tab: 'cloud-computer', label: 'Cloud computer', adminOnly: false },
  { tab: 'boat-key', label: 'Boat key', adminOnly: true },
  { tab: 'members', label: 'Members', adminOnly: false },
] as const satisfies readonly {
  tab: SettingsTab
  label: string
  adminOnly: boolean
}[]

function TabBody(props: { org: OrgSummary; tab: SettingsTab; user: User }) {
  switch (props.tab) {
    case 'general':
      return <GeneralTab org={props.org} />
    case 'repositories':
      return <RepositoriesTab org={props.org} />
    case 'cloud-computer':
      return <ComputerTab org={props.org} />
    case 'boat-key':
      return <BoatKeyTab org={props.org} />
    case 'members':
      return <MembersTab org={props.org} user={props.user} />
  }
}

/**
 * The settings of an org: its name, its repositories, its cloud computer,
 * its Boat key, and its members. Each tab is a link with its own address.
 * Only an admin sees the Boat key tab. A member who opens its address sees
 * the General tab, and every other tab without its edit actions.
 */
export function OrgSettingsScreen(props: {
  org: OrgSummary
  tab: SettingsTab
  user: User
}) {
  const { org } = props
  const admin = org.role === 'admin'
  const phone = useViewport() === 'phone'
  const tab = admin || props.tab !== 'boat-key' ? props.tab : 'general'
  return (
    <Page
      back={{ label: 'Workspaces', to: routes.org(org.id) }}
      subtitle="Org settings"
      tabs={
        <LinkTabs
          label="Org settings"
          tabs={tabs
            .filter((item) => admin || !item.adminOnly)
            .map((item) => ({
              label: item.label,
              to: routes.settings(org.id, item.tab),
              selected: item.tab === tab,
            }))}
          wrap={phone}
        />
      }
      title={org.name}
    >
      <TabBody key={org.id} org={org} tab={tab} user={props.user} />
    </Page>
  )
}
