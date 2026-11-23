import { SuspendedOrgNotice } from '../../ui/components/orgs/SuspendedOrgNotice'
import type { SettingsTab } from '../../app/router'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgAccess } from '../context'
import { ComputerTab } from './ComputerTab'
import { GeneralTab } from './GeneralTab'
import { MembersSettings } from './MembersSettings'
import { RepositoriesTab } from './RepositoriesTab'
import { SecretsTab } from './SecretsTab'

function TabBody(props: { org: OrgSummary; tab: SettingsTab; user: User }) {
  switch (props.tab) {
    case 'general':
      return <GeneralTab org={props.org} user={props.user} />
    case 'repositories':
      return <RepositoriesTab org={props.org} />
    case 'cloud-computer':
      return <ComputerTab org={props.org} />
    case 'secrets':
      return <SecretsTab org={props.org} user={props.user} />
    case 'members':
      return <MembersSettings org={props.org} user={props.user} />
  }
}

/**
 * A tab of the settings of an org: its name, its repositories, its cloud
 * computer, its secrets, or its members. A member sees every tab without
 * its edit actions, except Secrets, where every member adds secrets and
 * changes the own ones. A suspended org shows its notice above every tab,
 * and every person sees the tabs without edit actions.
 */
export function OrgTabContent(props: {
  org: OrgSummary
  tab: SettingsTab
  user: User
}) {
  const { org } = props
  const { suspended } = useOrgAccess(org)
  return (
    <>
      {suspended ? <SuspendedOrgNotice org={org} /> : null}
      <TabBody key={org.id} org={org} tab={props.tab} user={props.user} />
    </>
  )
}
