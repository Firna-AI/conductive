import { Hammer } from 'lucide-react'
import { changedScriptNotice } from '../app/first-build'
import type { Org } from '../shared/api'
import type {
  BuildLogEvent,
  BuildsResponse,
  OrgSettings,
} from '../shared/org-settings'
import { BuildCard } from './BuildCard'
import { EnvVarsSection, ScriptSection } from './ComputerSections'
import { RepositoryNotice } from './RepositoryNotice'
import { softwareSentence } from './software'
import { ViewportScope, type Viewport } from './ui/controls'
import { Notice } from './ui/Notice'
import { TabIntro } from './ui/Section'

export type MemberComputerViewProps = {
  /** The org, for its name in the text. */
  org: Org
  settings: OrgSettings
  builds: BuildsResponse
  /**
   * The log of the newest build of `builds` while it runs or after it
   * failed, oldest event first. A refresh does not count as a build. Null
   * shows that the log did not load. The view shows no log when the newest
   * build succeeded.
   */
  log: readonly BuildLogEvent[] | null
  viewport: Viewport
  /** The time now, in Unix milliseconds, for the times of the builds. */
  now: number
  timeZone?: string
  /**
   * The org is suspended, so nothing in it changes, also for an admin. The
   * intro then says nothing about admins, because the notice of the org
   * says why.
   */
  suspended?: boolean
}

/**
 * The notice under an install script that differs from the script that the
 * org image ran, with the words that the tab of an admin also shows. Only
 * an admin builds the computer, so the notice has no Build computer.
 */
function ChangedScript(props: { builds: BuildsResponse }) {
  const notice = changedScriptNotice(props.builds)
  return <Notice body={notice.body} icon={Hammer} title={notice.title} />
}

/**
 * The heading of the Cloud computer tab of a member who is not an admin, or
 * of anyone in a suspended org.
 */
export function MemberComputerIntro(props: {
  orgName: string
  suspended?: boolean
}) {
  const note = props.suspended ? '' : ' Only an admin can change it.'
  return (
    <TabIntro title="Cloud computer">
      {`The shared cloud computer of ${props.orgName}. Every workspace starts from it, with every repository of the org.${note}`}
    </TabIntro>
  )
}

/**
 * The Cloud computer tab of a member who is not an admin, from data that
 * the caller gives: the repository notice, the builds with the log of the
 * newest build, both scripts as text, and the names of the env vars. It has
 * no Build computer, no Save script, and no Add variable, because only
 * admins change the cloud computer. The notice of the install script shows
 * only for a change of the script. It holds no state and loads nothing, so
 * each new value of its props shows at once, such as a new log event. Mount
 * it in the page column of the org settings.
 */
export function MemberComputerView(props: MemberComputerViewProps) {
  const { settings, builds } = props
  return (
    <ViewportScope viewport={props.viewport}>
      <MemberComputerIntro
        orgName={props.org.name}
        suspended={props.suspended}
      />
      <RepositoryNotice
        builds={builds}
        org={props.org}
        suspended={props.suspended}
      />
      <BuildCard
        builds={builds}
        log={props.log}
        now={props.now}
        timeZone={props.timeZone}
      />
      <ScriptSection
        description={[
          softwareSentence(settings.baseImage),
          'The install script runs only at a build of the computer.',
        ]
          .filter((sentence) => sentence !== null)
          .join(' ')}
        notice={
          builds.changes.installScript ? (
            <ChangedScript builds={builds} />
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
