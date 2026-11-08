import { Hammer } from 'lucide-react'
import { type EnvVar, includedSoftware } from '../../fixtures/computer'
import { ActionButton } from '../common/actions'
import { Notice } from '../common/Notice'
import { BuildSection, type BuildState, type OrgBuilds } from './BuildSection'
import { EnvVarsSection, ScriptSection } from './EnvironmentSections'
import type { ReadOnlyCause } from './OrgSections'
import { TabIntro } from './TabIntro'

/**
 * The cloud computer of an org: its builds, its scripts, and its env vars.
 * A new org starts with empty scripts and no env vars.
 */
export type OrgComputer = OrgBuilds & {
  installScript: string
  /** The install script after an admin changed it, which the next build runs. */
  changedInstallScript: string
  startupScript: string
  envVars: readonly EnvVar[]
}

/**
 * The org's cloud computer: its builds, its scripts, and its env vars.
 * `readOnly` shows them without edit fields and actions, for a member who
 * is not an admin (decision 57), and for everyone in a suspended org.
 */
export function ComputerTab(props: {
  org: string
  build: BuildState
  computer: OrgComputer
  readOnly?: ReadOnlyCause
}) {
  const { computer } = props
  const changed = props.build === 'changed'
  const readOnly = props.readOnly !== undefined
  return (
    <>
      <TabIntro title="Cloud computer">
        The shared cloud computer of {props.org}. Every workspace starts from
        it, with every repository of the org.
        {props.readOnly === 'member' ? ' Only an admin can change it.' : null}
      </TabIntro>
      <BuildSection builds={computer} readOnly={readOnly} state={props.build} />
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
        script={
          changed ? computer.changedInstallScript : computer.installScript
        }
        title="Install software"
      />
      <ScriptSection
        description="Runs in the cloud computer of each workspace, at each start and resume."
        readOnly={readOnly}
        script={computer.startupScript}
        title="Startup script"
      />
      <EnvVarsSection
        org={props.org}
        readOnly={readOnly}
        vars={computer.envVars}
      />
    </>
  )
}
