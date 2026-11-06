import { useCallback } from 'react'
import type { Org } from '../shared/api'
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
 * loaded once from the API: a convenience around `MemberComputerView`. It
 * does not follow a running build. A caller with live builds and log events
 * renders `MemberComputerView` itself. Mount it in the page column of the
 * org settings.
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
  const { state, retry } = useResource(load)
  if (state.status === 'ready') {
    return (
      <MemberComputerView
        builds={state.value.builds}
        log={state.value.log}
        now={props.now}
        org={org}
        settings={state.value.settings}
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
