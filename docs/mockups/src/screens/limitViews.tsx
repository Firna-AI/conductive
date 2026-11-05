import {
  Archive,
  CalendarClock,
  CirclePause,
  Hourglass,
  Square,
  Timer,
} from 'lucide-react'
import { LimitPanel, WorkspaceActions } from '../components/limits/LimitPanel'
import { firnaMinutes } from '../fixtures/billing'
import { firnaWorkspaces } from '../fixtures/freeOrg'
import {
  freePlan,
  resets,
  runningPerMember,
  startsPerDay,
} from '../fixtures/limits'
import { you } from '../fixtures/members'
import { orgs, type Org } from '../fixtures/orgs'
import { workspaceList, type ActivityStatus } from '../fixtures/workspaces'

/**
 * A limit that stops a new workspace: the free org at its 3 workspaces or
 * its 600 minutes, a person at the starts of a day or an hour, or a member
 * of a paid org at the cloud computers that run at once.
 */
export const limitKeys = [
  'none',
  'workspaces',
  'minutes',
  'starts',
  'starts-hour',
  'running',
] as const

export type LimitKey = (typeof limitKeys)[number]

/**
 * The org of each limit. The plan limits belong to the free org, and the
 * start limits of a person show there too. Only a paid org has the running
 * limit.
 */
export function limitOrg(limit: LimitKey): Org {
  return limit === 'none' || limit === 'running' ? orgs.acme : orgs.firna
}

/** A cloud computer runs while its workspace starts, works, or waits. */
const running: ReadonlySet<ActivityStatus> = new Set([
  'starting',
  'working',
  'unread',
  'ready',
])

/** The one way forward of a limit, in place of the empty chat. */
export function LimitView(props: { limit: Exclude<LimitKey, 'none'> }) {
  const org = limitOrg(props.limit)
  switch (props.limit) {
    case 'workspaces':
      return (
        <LimitPanel
          body={`${org.name} is on Free, which keeps up to ${freePlan.workspaces} workspaces. Archived workspaces don't count.`}
          icon={Archive}
          title="Archive a workspace to start a new one"
        >
          <WorkspaceActions
            action="Archive"
            icon={Archive}
            label={`Workspaces of ${org.name}`}
            workspaces={firnaWorkspaces}
          />
        </LimitPanel>
      )
    case 'minutes':
      return (
        <LimitPanel
          body={`${org.name} used its ${freePlan.minutes} free minutes for ${firnaMinutes.month}.`}
          icon={Hourglass}
          title={`Cloud computers start again on ${resets.minutes}`}
        />
      )
    case 'starts':
      return (
        <LimitPanel
          body={`You used your ${startsPerDay} starts for today. They come back at ${resets.day}.`}
          icon={CalendarClock}
          title="You can start cloud computers again tomorrow"
        />
      )
    case 'starts-hour':
      return (
        <LimitPanel
          body="You used the starts of this hour."
          icon={Timer}
          title={`You can start cloud computers again at ${resets.hour}`}
        />
      )
    case 'running': {
      const yours = workspaceList.filter(
        (item) => item.owner === you && running.has(item.status),
      )
      return (
        <LimitPanel
          body={`You have ${runningPerMember} cloud computers running, the most that each member runs at once.`}
          icon={CirclePause}
          title="Stop a cloud computer to start a new one"
        >
          <WorkspaceActions
            action="Stop"
            icon={Square}
            label="Your running cloud computers"
            workspaces={yours}
          />
        </LimitPanel>
      )
    }
  }
}
