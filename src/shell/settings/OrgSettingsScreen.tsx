import { SuspendedOrgNotice } from '../../../docs/mockups/src/components/orgs/SuspendedOrgNotice'
import { routes, type SettingsTab } from '../../app/router'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgAccess } from '../context'
import { Page } from '../layout/Page'
import { LinkTabs } from '../ui/links'
import { useViewport } from '../ui/viewport'
import { ComputerTab } from './ComputerTab'
import { GeneralTab } from './GeneralTab'
import { MembersSettings } from './MembersSettings'
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
      return <GeneralTab org={props.org} user={props.user} />
    case 'repositories':
      return <RepositoriesTab org={props.org} />
    case 'cloud-computer':
      return <ComputerTab org={props.org} />
    case 'members':
      return <MembersSettings org={props.org} user={props.user} />
  }
}

/**
 * The settings of an org: its name, its repositories, its cloud computer,
 * and its members. Each tab is a link with its own address. A member sees
 * every tab without its edit actions. A suspended org shows its notice
 * above every tab, and every person sees the tabs without edit actions.
 */
export function OrgSettingsScreen(props: {
  org: OrgSummary
  tab: SettingsTab
  user: User
}) {
  const { org, tab } = props
  const phone = useViewport() === 'phone'
  const { suspended } = useOrgAccess(org)
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
      {suspended ? <SuspendedOrgNotice org={org} /> : null}
      <TabBody key={org.id} org={org} tab={tab} user={props.user} />
    </Page>
  )
}
