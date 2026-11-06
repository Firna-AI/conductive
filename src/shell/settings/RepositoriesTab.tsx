import { useEffect } from 'react'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { useStore } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgModel } from '../context'
import { Loaded } from './LoadState'
import { RepositoryPicker } from './RepositoryPicker'
import { ChosenRepositories } from './RepositoryRows'

/**
 * The repositories that the cloud computer of the org holds (decision 10).
 * An admin adds and removes them, and the change takes effect at the next
 * build. A member sees the chosen ones only (decision 57).
 */
export function RepositoriesTab(props: { org: OrgSummary }) {
  const { org } = props
  const admin = org.role === 'admin'
  const model = useOrgModel(org.id)
  const repositories = useStore(model.repositories)
  useEffect(() => {
    model.ensure('repositories')
  }, [model])
  return (
    <Section
      description={`The cloud computer of ${org.name} holds these repositories, and its workspaces start in them. ${admin ? 'A change takes effect at the next build.' : 'Only an admin can change them.'}`}
      title="Repositories"
    >
      <Loaded
        failure="The repositories did not load"
        retry={() => model.reload('repositories')}
        value={repositories}
      >
        {(list) =>
          admin ? (
            <RepositoryPicker model={model} repositories={list} />
          ) : (
            <ChosenRepositories orgName={org.name} repositories={list} />
          )
        }
      </Loaded>
    </Section>
  )
}
