import { useCallback, useEffect, useRef } from 'react'
import type { Org } from '../shared/api'
import type { SkillsRepositoryLookupResponse } from '../shared/org-settings'
import type { MembersApi } from './api/client'
import {
  MemberComputerIntro,
  MemberComputerView,
  type MemberComputerViewProps,
} from './MemberComputerView'
import { useResource } from './useResource'
import { ViewportScope, type Viewport } from './ui/controls'
import { Loading, LoadFailure } from './ui/Loading'

type Computer = Pick<MemberComputerViewProps, 'settings' | 'builds' | 'log'>

/** The settings and the builds, and the log of the newest build that runs or failed. */
async function loadComputer(api: MembersApi, orgId: string): Promise<Computer> {
  const [settings, builds] = await Promise.all([
    api.settings(orgId),
    api.builds(orgId),
  ])
  const newest = [...builds.builds]
    .sort((first, second) => second.startedAt - first.startedAt)
    .at(0)
  if (!newest || newest.state === 'succeeded') {
    return { settings, builds, log: [] }
  }
  const log = await api.build(orgId, newest.id).then(
    (response) => response.log,
    () => null,
  )
  return { settings, builds, log }
}

/**
 * The Cloud computer tab of a member who is not an admin, with its data
 * read at opening from the API: a convenience around `MemberComputerView`. It
 * does not follow a running build. The lookup of the skills loads on its
 * own, so a lookup that fails never keeps the tab from showing. A caller
 * with live builds and log events renders `MemberComputerView` itself.
 * A lookup for another repository stays hidden and rereads settings once.
 * Mount it in the page column of the org settings.
 */
export function MemberComputerTab(props: {
  api: MembersApi
  org: Org
  viewport: Viewport
  /** The time now, in Unix milliseconds, for the times of the builds. */
  now: number
  timeZone?: string
}) {
  const { api, org } = props
  const load = useCallback(() => loadComputer(api, org.id), [api, org.id])
  const lookup = useCallback(() => api.skills(org.id), [api, org.id])
  const { state, retry } = useResource(load)
  const { state: skills, retry: retrySkills } = useResource(lookup)
  const seen = useRef<{
    repository?: string
    reconciled?: SkillsRepositoryLookupResponse
  }>({})
  useEffect(() => {
    if (state.status !== 'ready') return
    const repository = state.value.settings.skillsRepository ?? ''
    const previous = seen.current.repository
    seen.current.repository = repository
    if (previous !== undefined && previous !== repository) {
      retrySkills()
    } else if (
      skills.status === 'ready' &&
      skills.value.repository !== repository &&
      seen.current.reconciled !== skills.value
    ) {
      seen.current.reconciled = skills.value
      retry()
    }
  }, [state, skills, retrySkills, retry])
  if (state.status === 'ready') {
    const shownSkills =
      skills.status === 'ready' &&
      skills.value.repository !== (state.value.settings.skillsRepository ?? '')
        ? { status: 'loading' as const }
        : skills
    return (
      <MemberComputerView
        builds={state.value.builds}
        log={state.value.log}
        now={props.now}
        onRetrySkills={retrySkills}
        org={org}
        settings={state.value.settings}
        skills={shownSkills}
        timeZone={props.timeZone}
        viewport={props.viewport}
      />
    )
  }
  return (
    <ViewportScope viewport={props.viewport}>
      <MemberComputerIntro orgName={org.name} />
      {state.status === 'loading' ? (
        <Loading label="Loading the cloud computer" />
      ) : (
        <LoadFailure
          message={state.message}
          onRetry={retry}
          title="The cloud computer did not load"
        />
      )}
    </ViewportScope>
  )
}
