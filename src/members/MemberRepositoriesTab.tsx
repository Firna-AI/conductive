import { useCallback } from 'react'
import { FolderGit2 } from 'lucide-react'
import type { Org } from '../shared/api'
import type { BuildsResponse, Repository } from '../shared/org-settings'
import type { MembersApi } from './api/client'
import { RepositoryNotice } from './RepositoryNotice'
import { useResource } from './useResource'
import { ViewportScope, type Viewport } from './ui/controls'
import { Loading, LoadFailure } from './ui/Loading'
import { Section, SectionText } from './ui/Section'
import styles from './MemberRepositoriesTab.module.css'

/**
 * The repositories that the org chose, without search, Add, or Remove, for
 * a member who is not an admin (decision 57), and for everyone in a
 * suspended org, whose notice says why.
 */
export function OrgRepositoryList(props: {
  repositories: readonly Repository[]
  suspended?: boolean
}) {
  const chosen = props.repositories.filter((repository) => repository.selected)
  if (chosen.length === 0) {
    return (
      <SectionText muted>
        {props.suspended
          ? 'No repositories yet.'
          : 'No repositories yet. An admin can add them.'}
      </SectionText>
    )
  }
  return (
    <ul aria-label="Repositories" className={styles.list}>
      {chosen.map((repository) => (
        <li className={styles.row} key={repository.id}>
          <FolderGit2 aria-hidden className={styles.icon} size={15} />
          <span className={styles.text}>
            <span className={styles.name}>{repository.fullName}</span>
            {repository.description ? (
              <span className={styles.description}>
                {repository.description}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * The Repositories tab of the org settings for a member who is not an
 * admin: the repositories of the org, read-only. Only admins change them,
 * as decision 57 says. In a suspended org everyone sees this tab, and it
 * adds no sentence about admins, because the notice of the org says why.
 * With `builds`, the repository notice above the list names the changes
 * that the cloud computer does not hold yet. Mount it in the page column
 * of the org settings.
 */
export function MemberRepositoriesTab(props: {
  api: MembersApi
  org: Org
  viewport: Viewport
  /** The org is suspended, so nothing in it changes, also for an admin. */
  suspended?: boolean
  /** The builds of the org, for the repository notice, as they load. */
  builds?: BuildsResponse
}) {
  const { api, org } = props
  const note = props.suspended ? '' : ' Only an admin can change them.'
  const load = useCallback(() => api.repositories(org.id), [api, org.id])
  const { state, retry } = useResource(load)
  return (
    <ViewportScope viewport={props.viewport}>
      <Section
        description={`The cloud computer of ${org.name} holds these repositories, and its workspaces start in them.${note}`}
        title="Repositories"
      >
        {props.builds ? (
          <RepositoryNotice
            builds={props.builds}
            org={org}
            suspended={props.suspended}
          />
        ) : null}
        {state.status === 'loading' ? (
          <Loading label="Loading the repositories" />
        ) : null}
        {state.status === 'failed' ? (
          <LoadFailure
            message={state.message}
            onRetry={retry}
            title="The repositories did not load"
          />
        ) : null}
        {state.status === 'ready' ? (
          <OrgRepositoryList
            repositories={state.value.repositories}
            suspended={props.suspended}
          />
        ) : null}
      </Section>
    </ViewportScope>
  )
}
