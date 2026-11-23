import { useEffect } from 'react'
import { orgAgentsCopy as copy } from '../../ui/components/settings/orgAgentsCopy'
import { Section } from '../../ui/components/settings/Section'
import { mayChangeSettings } from '../../app/permissions'
import { useStore } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgAccess, useOrgModel } from '../context'
import { Loaded } from './LoadState'
import { OrgLoginList } from './OrgLoginList'

/**
 * The Agents tab of the org settings, after Cloud computer, from decision
 * 1 B of the org logins plan: the org login of Claude and of Codex, an API
 * key or an own endpoint that the members of the org use when they have no
 * login of their own. An admin connects, replaces, and removes each org
 * login, and sets its switch "Use for every member". A member who is not
 * an admin sees the tab read-only, with the sentence that only an admin
 * can change the logins (decision 57). In a suspended org everyone sees it
 * read-only, and the notice of the org says why. The tab reads the logins
 * while it shows, and again at each return to the page.
 */
export function AgentsTab(props: { org: OrgSummary }) {
  const { org } = props
  const access = useOrgAccess(org)
  const model = useOrgModel(org.id)
  const logins = useStore(model.agentLogins.logins)
  useEffect(() => model.watch('agentLogins'), [model])
  const editable = mayChangeSettings(access)
  const note = editable || access.suspended ? '' : copy.memberNote
  return (
    <Section
      description={`${copy.description(org.name)}${note}`}
      title="Agents"
    >
      <Loaded
        failure="The agent logins did not load"
        retry={() => model.reload('agentLogins')}
        value={logins}
      >
        {(list) => (
          <OrgLoginList
            editable={editable}
            logins={list}
            model={model.agentLogins}
            org={org.name}
          />
        )}
      </Loaded>
    </Section>
  )
}
