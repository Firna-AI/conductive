import type { ReactNode } from 'react'
import { Hammer } from 'lucide-react'
import { type EnvVar, includedSoftware } from '../../fixtures/computer'
import { ActionButton } from '../common/actions'
import { Notice } from '../common/Notice'
import { BuildSection, type BuildState, type OrgBuilds } from './BuildSection'
import { ScriptSection } from './EnvironmentSections'
import { EnvVarsSection, type EnvVarForm } from './EnvVarsSection'
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
 * The notice under an install script that an admin saved after the newest
 * build started. While the first build of an org runs, one more build runs
 * the script when that build succeeds, so the notice offers no action. An
 * org with no good build offers its build in the head of the card. Else
 * Build computer starts the next build, after a build that runs.
 */
function changedNotice(props: {
  build: BuildState
  builds: OrgBuilds
  readOnly: boolean
}): ReactNode {
  const title = 'The install script changed'
  if (props.builds.lastGood === undefined) {
    const body =
      props.build === 'building'
        ? 'One more build runs it when this build succeeds.'
        : 'It runs at the next build.'
    return <Notice body={body} icon={Hammer} title={title} />
  }
  return (
    <Notice
      action={
        props.readOnly ? undefined : (
          <ActionButton
            disabled={props.build === 'building'}
            icon={Hammer}
            tone="primary"
          >
            Build computer
          </ActionButton>
        )
      }
      body="It runs at the next build. Workspaces keep the current build until then."
      icon={Hammer}
      title={title}
    />
  )
}

/**
 * The org's cloud computer: its builds, its scripts, and its env vars.
 * `readOnly` shows them without edit fields and actions, for a member who
 * is not an admin (decision 57), and for everyone in a suspended org.
 * `envForm` opens a form of the env vars. `repositoryNotice` shows the
 * repository changes that the computer does not hold yet, under the intro.
 */
export function ComputerTab(props: {
  org: string
  build: BuildState
  /** The install script: as the newest build started, or changed since. */
  script: 'built' | 'changed'
  computer: OrgComputer
  readOnly?: ReadOnlyCause
  envForm?: EnvVarForm
  /** The repository notice, while a repository change waits for a build. */
  repositoryNotice?: ReactNode
}) {
  const { computer } = props
  const changed = props.script === 'changed'
  const repositoriesChanged = Boolean(props.repositoryNotice)
  const readOnly = props.readOnly !== undefined
  return (
    <>
      <TabIntro title="Cloud computer">
        The shared cloud computer of {props.org}. Every workspace starts from
        it, with every repository of the org.
        {props.readOnly === 'member' ? ' Only an admin can change it.' : null}
      </TabIntro>
      {props.repositoryNotice}
      <BuildSection
        builds={computer}
        changeWaits={changed || repositoriesChanged}
        readOnly={readOnly}
        state={props.build}
      />
      <ScriptSection
        description={
          readOnly
            ? `${includedSoftware} The install script runs only at a build of the computer.`
            : `${includedSoftware} The install script runs only when you build the computer.`
        }
        notice={
          changed
            ? changedNotice({ build: props.build, builds: computer, readOnly })
            : undefined
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
        form={props.envForm}
        org={props.org}
        readOnly={readOnly}
        vars={computer.envVars}
      />
    </>
  )
}
