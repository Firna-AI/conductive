import { useEffect, useState } from 'react'
import { Hammer } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { TabIntro } from '../../../docs/mockups/src/components/settings/TabIntro'
import { ComputerModel } from '../../app/computer-model'
import { changedScriptNotice } from '../../app/first-build'
import { latestBuild } from '../../app/org-model'
import { mayChangeSettings } from '../../app/permissions'
import { useStore, valueOf } from '../../app/store'
import { softwareSentence } from '../../members/software'
import type { BuildsResponse } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgAccess, useOrgModel } from '../context'
import { useAction, type Action } from '../ui/useAction'
import { BuildCard } from './BuildCard'
import { BuildButton } from './BuildParts'
import { EnvVarsSection } from './EnvVarsSection'
import { Loaded } from './LoadState'
import { MemberComputer } from './MemberComputer'
import { AdminRepositoryNotice } from './RepositoryChangeNotice'
import { ScriptSection } from './ScriptSection'

/**
 * The notice under an install script that differs from the script that the
 * org image ran, with the words of `changedScriptNotice`. Once the org has
 * a good build, it offers Build computer, which waits while a build runs.
 */
function ChangedScript(props: { builds: BuildsResponse; build: Action<[]> }) {
  const { builds } = props
  const notice = changedScriptNotice(builds)
  const running = latestBuild(builds)?.state === 'running'
  return (
    <Notice
      action={
        notice.offersBuild ? (
          <BuildButton action={props.build} running={running} tone="primary" />
        ) : undefined
      }
      body={notice.body}
      icon={Hammer}
      title={notice.title}
    />
  )
}

/**
 * The Cloud computer tab of an admin, as the model holds it: the builds,
 * the scripts, and the env vars, which only an admin builds and changes
 * (decision 57), and nobody in a suspended org. Build computer in the head
 * of the builds and in the notice of a changed install script is one
 * action, so one press starts one build. The repository notice under the
 * intro has no action, because the build card under it has the same one.
 * The notice of the install script shows only for a change of the script.
 */
export function ComputerSettings(props: {
  org: OrgSummary
  computer: ComputerModel
}) {
  const { org, computer } = props
  const model = useOrgModel(org.id)
  const builds = useStore(model.builds)
  const settings = useStore(computer.settings)
  const build = useAction(
    () => computer.startBuild(),
    'The build did not start',
  )
  const shown = valueOf(builds)
  const changed = shown?.changes.installScript ? (
    <ChangedScript build={build} builds={shown} />
  ) : undefined
  return (
    <>
      <TabIntro title="Cloud computer">
        {`The shared cloud computer of ${org.name}. Every workspace starts from it, with every repository of the org.`}
      </TabIntro>
      <AdminRepositoryNotice builds={shown} />
      <Loaded
        failure="The builds did not load"
        retry={() => model.reload('builds')}
        value={builds}
      >
        {(value) => (
          <BuildCard build={build} builds={value} computer={computer} />
        )}
      </Loaded>
      <Loaded
        failure="The settings of the cloud computer did not load"
        retry={() => computer.load()}
        value={settings}
      >
        {(value) => (
          <>
            <ScriptSection
              computer={computer}
              description={[
                softwareSentence(value.baseImage),
                'The install script runs only when you build the computer.',
              ]
                .filter((sentence) => sentence !== null)
                .join(' ')}
              kind="installScript"
              notice={changed}
              script={value.installScript}
              title="Install software"
            />
            <ScriptSection
              computer={computer}
              description="Runs in the cloud computer of each workspace, at each start and resume."
              kind="startupScript"
              script={value.startupScript}
              title="Startup script"
            />
            <EnvVarsSection
              computer={computer}
              org={org}
              vars={value.envVars}
            />
          </>
        )}
      </Loaded>
    </>
  )
}

/**
 * The Cloud computer tab. It keeps one computer model while it shows: the
 * model reads the settings and follows the builds, and it stops following
 * them and the build log on unmount. An admin gets the settings with their
 * actions. A member who is not an admin, and everyone in a suspended org,
 * get the read-only view of the members UI, with the same live builds and
 * log.
 */
export function ComputerTab(props: { org: OrgSummary }) {
  const access = useOrgAccess(props.org)
  const model = useOrgModel(props.org.id)
  const [computer] = useState(() => new ComputerModel(model))
  useEffect(() => {
    computer.start()
    return () => computer.stop()
  }, [computer])
  if (mayChangeSettings(access)) {
    return <ComputerSettings computer={computer} org={props.org} />
  }
  return (
    <MemberComputer
      computer={computer}
      org={props.org}
      suspended={access.suspended}
    />
  )
}
