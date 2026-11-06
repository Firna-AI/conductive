import { useEffect, useState } from 'react'
import { Hammer } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { TabIntro } from '../../../docs/mockups/src/components/settings/TabIntro'
import { ComputerModel } from '../../app/computer-model'
import { latestBuild } from '../../app/org-model'
import { useStore, valueOf } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgModel } from '../context'
import { useAction } from '../ui/useAction'
import { BuildCard } from './BuildCard'
import { BuildButton } from './BuildParts'
import { EnvVarsSection } from './EnvVarsSection'
import { Loaded } from './LoadState'
import { ScriptSection } from './ScriptSection'

/**
 * The Cloud computer tab as the model holds it: the builds, the scripts,
 * and the env vars. Only an admin builds and changes them (decision 57).
 * Build computer in the head of the builds and in the notice of a changed
 * install script is one action, so one press starts one build.
 */
export function ComputerSettings(props: {
  org: OrgSummary
  computer: ComputerModel
}) {
  const { org, computer } = props
  const admin = org.role === 'admin'
  const model = useOrgModel(org.id)
  const builds = useStore(model.builds)
  const settings = useStore(computer.settings)
  const build = useAction(
    () => computer.startBuild(),
    'The build did not start',
  )
  const loaded = valueOf(builds)
  const running = loaded ? latestBuild(loaded)?.state === 'running' : false
  const changed = (
    <Notice
      action={
        admin ? (
          <BuildButton action={build} running={running} tone="primary" />
        ) : undefined
      }
      body="It runs at the next build. Workspaces keep the current build until then."
      icon={Hammer}
      title="The install script changed"
    />
  )
  return (
    <>
      <TabIntro title="Cloud computer">
        {`The shared cloud computer of ${org.name}. Every workspace starts from it, with every repository of the org.${admin ? '' : ' Only an admin can change it.'}`}
      </TabIntro>
      <Loaded
        failure="The builds did not load"
        retry={() => model.reload('builds')}
        value={builds}
      >
        {(value) => (
          <BuildCard
            admin={admin}
            build={build}
            builds={value}
            computer={computer}
            needsBuild={settings.state === 'ready' && settings.value.needsBuild}
          />
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
              admin={admin}
              computer={computer}
              description={
                admin
                  ? 'The install script runs only when you build the computer.'
                  : 'The install script runs only at a build of the computer.'
              }
              kind="installScript"
              notice={value.needsBuild ? changed : undefined}
              script={value.installScript}
              title="Install software"
            />
            <ScriptSection
              admin={admin}
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
 * model loads the settings, and stops following a build log on unmount.
 */
export function ComputerTab(props: { org: OrgSummary }) {
  const model = useOrgModel(props.org.id)
  const [computer] = useState(() => new ComputerModel(model))
  useEffect(() => {
    void computer.load()
    return () => computer.stop()
  }, [computer])
  useEffect(() => {
    model.ensure('builds')
  }, [model])
  return <ComputerSettings computer={computer} org={props.org} />
}
