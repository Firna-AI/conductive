import { Hammer } from 'lucide-react'
import type { Org } from '../shared/api'
import type {
  BuildLogEvent,
  BuildsResponse,
  OrgSettings,
} from '../shared/org-settings'
import { BuildCard } from './BuildCard'
import { EnvVarsSection, ScriptSection } from './ComputerSections'
import { ViewportScope, type Viewport } from './ui/controls'
import { Notice } from './ui/Notice'
import { TabIntro } from './ui/Section'

/**
 * What every cloud computer includes before the install script runs, as the
 * mockups state it. The org image of Milestone 5 owns this list.
 */
const includedSoftware =
  'Cloud computers run Ubuntu 24.04 and include Node.js 24, npm, pnpm, Bun, Python 3.12, uv, Go, Rust, Java, GCC, Clang, Docker, git, and gh.'

export type MemberComputerViewProps = {
  /** The org, for its name in the text. */
  org: Org
  settings: OrgSettings
  builds: BuildsResponse
  /**
   * The log of the newest build of `builds` while it runs or after it
   * failed, oldest event first. Null shows that the log did not load. The
   * view shows no log when the newest build succeeded.
   */
  log: readonly BuildLogEvent[] | null
  viewport: Viewport
  /** The time now, in Unix milliseconds, for the times of the builds. */
  now: number
  timeZone?: string
}

/** The heading of the Cloud computer tab of a member who is not an admin. */
export function MemberComputerIntro(props: { orgName: string }) {
  return (
    <TabIntro title="Cloud computer">
      The shared cloud computer of {props.orgName}. Every workspace starts from
      it, with every repository of the org. Only an admin can change it.
    </TabIntro>
  )
}

/**
 * The Cloud computer tab of a member who is not an admin, from data that
 * the caller gives: the builds with the log of the newest build, both
 * scripts as text, and the names of the env vars. It has no Build computer,
 * no Save script, and no Add variable, because only admins change the cloud
 * computer (decision 57). It holds no state and loads nothing, so each new
 * value of its props shows at once, such as a new log event. Mount it in the
 * page column of the org settings.
 */
export function MemberComputerView(props: MemberComputerViewProps) {
  const { settings } = props
  return (
    <ViewportScope viewport={props.viewport}>
      <MemberComputerIntro orgName={props.org.name} />
      <BuildCard
        builds={props.builds}
        log={props.log}
        now={props.now}
        timeZone={props.timeZone}
      />
      <ScriptSection
        description={`${includedSoftware} The install script runs only at a build of the computer.`}
        notice={
          settings.needsBuild ? (
            <Notice
              body="It runs at the next build. Workspaces keep the current build until then."
              icon={Hammer}
              title="The install script changed"
            />
          ) : undefined
        }
        script={settings.installScript}
        title="Install software"
      />
      <ScriptSection
        description="Runs in the cloud computer of each workspace, at each start and resume."
        script={settings.startupScript}
        title="Startup script"
      />
      <EnvVarsSection envVars={settings.envVars} orgName={props.org.name} />
    </ViewportScope>
  )
}
