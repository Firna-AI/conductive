import { Hammer } from 'lucide-react'
import {
  changedInstallScript,
  includedSoftware,
  installScript,
  startupScript,
} from '../../fixtures/computer'
import { ActionButton } from '../common/actions'
import { Notice } from '../common/Notice'
import { BuildSection, type BuildState } from './BuildSection'
import { EnvVarsSection, ScriptSection } from './EnvironmentSections'
import { TabIntro } from './TabIntro'

/**
 * The org's cloud computer: its builds, its scripts, and its env vars.
 * `readOnly` shows them without edit fields and actions, for a member who
 * is not an admin (decision 57).
 */
export function ComputerTab(props: {
  org: string
  build: BuildState
  readOnly?: boolean
}) {
  const changed = props.build === 'changed'
  const readOnly = props.readOnly ?? false
  return (
    <>
      <TabIntro title="Cloud computer">
        The shared cloud computer of {props.org}. Every workspace starts from
        it, with every repository of the org.
        {readOnly ? ' Only an admin can change it.' : null}
      </TabIntro>
      <BuildSection readOnly={readOnly} state={props.build} />
      <ScriptSection
        description={
          readOnly
            ? `${includedSoftware} The install script runs only at a build of the computer.`
            : `${includedSoftware} The install script runs only when you build the computer.`
        }
        notice={
          changed ? (
            <Notice
              action={
                readOnly ? undefined : (
                  <ActionButton icon={Hammer} tone="primary">
                    Build computer
                  </ActionButton>
                )
              }
              body="It runs at the next build. Workspaces keep the current build until then."
              icon={Hammer}
              title="The install script changed"
            />
          ) : undefined
        }
        readOnly={readOnly}
        script={changed ? changedInstallScript : installScript}
        title="Install software"
      />
      <ScriptSection
        description="Runs in the cloud computer of each workspace, at each start and resume."
        readOnly={readOnly}
        script={startupScript}
        title="Startup script"
      />
      <EnvVarsSection org={props.org} readOnly={readOnly} />
    </>
  )
}
