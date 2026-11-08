import { useEffect } from 'react'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { useStore } from '../../app/store'
import { MemberRepositoriesTab } from '../../members/MemberRepositoriesTab'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgModel } from '../context'
import { Loaded } from './LoadState'
import { useMembersApi, useMembersViewport } from './members-api'
import { RepositoryPicker } from './RepositoryPicker'

/**
 * The repositories that the cloud computer of the org holds (decision 10),
 * which an admin adds and removes. A change takes effect at the next build.
 */
function AdminRepositories(props: { org: OrgSummary }) {
  const { org } = props
  const model = useOrgModel(org.id)
  const repositories = useStore(model.repositories)
  useEffect(() => model.watch('repositories'), [model])
  return (
    <Section
      description={`The cloud computer of ${org.name} holds these repositories, and its workspaces start in them. A change takes effect at the next build.`}
      title="Repositories"
    >
      <Loaded
        failure="The repositories did not load"
        retry={() => model.reload('repositories')}
        value={repositories}
      >
        {(list) => <RepositoryPicker model={model} repositories={list} />}
      </Loaded>
    </Section>
  )
}

/**
 * The Repositories tab. An admin adds and removes the repositories. A
 * member who is not an admin sees the chosen ones only, in the read-only
 * tab of the members UI (decision 57).
 */
export function RepositoriesTab(props: { org: OrgSummary }) {
  const api = useMembersApi()
  const viewport = useMembersViewport()
  if (props.org.role === 'admin') return <AdminRepositories org={props.org} />
  return <MemberRepositoriesTab api={api} org={props.org} viewport={viewport} />
}
