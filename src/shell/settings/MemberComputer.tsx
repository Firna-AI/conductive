import type { BuildLog } from '../../app/build-log-follower'
import type { ComputerModel } from '../../app/computer-model'
import { latestBuild } from '../../app/org-model'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import { useNow } from '../../app/time'
import {
  MemberComputerIntro,
  MemberComputerView,
} from '../../members/MemberComputerView'
import { ViewportScope } from '../../members/ui/controls'
import { Loading, LoadFailure } from '../../members/ui/Loading'
import type { BuildLogEvent, ImageBuild } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgModel } from '../context'
import { useMembersViewport } from './members-api'

/**
 * The log of the newest build while it runs or after it failed: the lines
 * that the computer model follows, or `null` when they did not load. The
 * view shows no log of a build that succeeded. A log of another build
 * never shows, so a build that the model does not follow shows no lines.
 */
function newestLog(
  newest: ImageBuild | undefined,
  log: BuildLog | null,
): readonly BuildLogEvent[] | null {
  if (!newest || newest.state === 'succeeded') return []
  if (log?.buildId !== newest.id) return []
  return log.error ? null : log.events
}

/**
 * The Cloud computer tab of a member who is not an admin, and of everyone
 * in a suspended org: the read-only view of the members UI, with the live
 * builds, log, and settings of the computer model. The view follows a
 * running build as the tab of an admin does, and it shows no action,
 * because only an admin changes the cloud computer (decision 57), and
 * nobody in a suspended org.
 */
export function MemberComputer(props: {
  org: OrgSummary
  computer: ComputerModel
  suspended: boolean
}) {
  const { org, computer, suspended } = props
  const model = useOrgModel(org.id)
  const builds = useStore(model.builds)
  const settings = useStore(computer.settings)
  const log = useStore(computer.log)
  const { timeZone } = useServices()
  const viewport = useMembersViewport()
  const newest =
    builds.state === 'ready' ? latestBuild(builds.value) : undefined
  const now = useNow(newest?.state === 'running' ? 1_000 : 60_000)
  if (builds.state === 'ready' && settings.state === 'ready') {
    return (
      <MemberComputerView
        builds={builds.value}
        log={newestLog(newest, log)}
        now={now}
        org={org}
        settings={settings.value}
        suspended={suspended}
        timeZone={timeZone}
        viewport={viewport}
      />
    )
  }
  const failure =
    builds.state === 'failed'
      ? builds.error
      : settings.state === 'failed'
        ? settings.error
        : null
  const retry = () => {
    if (builds.state === 'failed') void model.reload('builds')
    if (settings.state === 'failed') void computer.load()
  }
  return (
    <ViewportScope viewport={viewport}>
      <MemberComputerIntro orgName={org.name} suspended={suspended} />
      {failure ? (
        <LoadFailure
          message={failure.message}
          onRetry={retry}
          title="The cloud computer did not load"
        />
      ) : (
        <Loading label="Loading the cloud computer" />
      )}
    </ViewportScope>
  )
}
