import { useEffect } from 'react'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { mayChangeSettings } from '../../app/permissions'
import { useStore, valueOf } from '../../app/store'
import { MemberRepositoriesTab } from '../../members/MemberRepositoriesTab'
import type { BuildsResponse } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgAccess, useOrgModel } from '../context'
import { useAction } from '../ui/useAction'
import { Loaded } from './LoadState'
import { useMembersApi, useMembersViewport } from './members-api'
import { RepositoryPicker } from './RepositoryPicker'
import { AdminRepositoryNotice } from './RepositoryChangeNotice'

/**
 * The repositories that the cloud computer of the org holds (decision 10),
 * which an admin adds and removes. An add starts a build, and a removal
 * waits for the next build. The repository notice above the list shows the
 * changes that the cloud computer does not hold yet, with Try again or
 * Build computer.
 */
function AdminRepositories(props: {
  org: OrgSummary
  builds: BuildsResponse | undefined
}) {
  const { org } = props
  const model = useOrgModel(org.id)
  const repositories = useStore(model.repositories)
  const build = useAction(() => model.startBuild(), 'The build did not start')
  useEffect(() => model.watch('repositories'), [model])
  return (
    <Section
      description={`The cloud computer of ${org.name} holds these repositories, and its workspaces start in them. Adding a repository starts a build.`}
      title="Repositories"
    >
      <AdminRepositoryNotice build={build} builds={props.builds} />
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
 * tab of the members UI (decision 57), and so does everyone in a suspended
 * org. Each of them reads the builds, for the repository notice.
 */
export function RepositoriesTab(props: { org: OrgSummary }) {
  const access = useOrgAccess(props.org)
  const api = useMembersApi(props.org.id)
  const viewport = useMembersViewport()
  const model = useOrgModel(props.org.id)
  const builds = valueOf(useStore(model.builds))
  useEffect(() => model.watch('builds'), [model])
  if (mayChangeSettings(access)) {
    return <AdminRepositories builds={builds} org={props.org} />
  }
  return (
    <MemberRepositoriesTab
      api={api}
      builds={builds}
      org={props.org}
      suspended={access.suspended}
      viewport={viewport}
    />
  )
}
