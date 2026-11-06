import { routes, type SettingsTab } from '../../app/router'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { Page } from '../layout/Page'
import { LinkTabs } from '../ui/links'
import { useViewport } from '../ui/viewport'
import { ComputerTab } from './ComputerTab'
import { GeneralTab } from './GeneralTab'
import { MembersTab } from './MembersTab'
import { RepositoriesTab } from './RepositoriesTab'

/** The parts of the org settings, in their order. */
const tabs = [
  { tab: 'general', label: 'General' },
  { tab: 'repositories', label: 'Repositories' },
  { tab: 'cloud-computer', label: 'Cloud computer' },
  { tab: 'members', label: 'Members' },
] as const satisfies readonly { tab: SettingsTab; label: string }[]

function TabBody(props: { org: OrgSummary; tab: SettingsTab; user: User }) {
  switch (props.tab) {
    case 'general':
      return <GeneralTab org={props.org} />
    case 'repositories':
      return <RepositoriesTab org={props.org} />
    case 'cloud-computer':
      return <ComputerTab org={props.org} />
    case 'members':
      return <MembersTab org={props.org} user={props.user} />
  }
}

/**
 * The settings of an org: its name, its repositories, its cloud computer,
 * and its members. Each tab is a link with its own address. A member sees
 * every tab without its edit actions (decision 57). The app runs every
 * cloud computer on its own Boat account, so no tab asks for a key
 * (decision 80).
 */
export function OrgSettingsScreen(props: {
  org: OrgSummary
  tab: SettingsTab
  user: User
}) {
  const { org, tab } = props
  const phone = useViewport() === 'phone'
  return (
    <Page
      back={{ label: 'Workspaces', to: routes.org(org.id) }}
      subtitle="Org settings"
      tabs={
        <LinkTabs
          label="Org settings"
          tabs={tabs.map((item) => ({
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
