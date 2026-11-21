import type { ReactNode } from 'react'
import { type EnvVar, includedSoftware } from '../../fixtures/computer'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { buildSection } from '../../entries/components/settings/BuildSection.mockup'
import { buildRuns, type BuildState, type OrgBuilds } from './BuildSection'
import { buildOf } from './BuildHistory'
import { scriptSection } from '../../entries/components/settings/EnvironmentSections.mockup'
import { envVarsSection } from '../../entries/components/settings/EnvVarsSection.mockup'
import type { EnvVarForm } from './EnvVarsSection'
import type { ReadOnlyCause } from './OrgSections'
import { tabIntro } from '../../entries/components/settings/TabIntro.mockup'
import { defined } from '../../defined'

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
    const body = buildRuns(props.build)
      ? 'One more build runs it when this build succeeds.'
      : 'It runs at the next build.'
    return (
      <notice.Component
        body={body}
        icon="hammer"
        moklyInstance="script-changed"
        title={title}
      />
    )
  }
  return (
    <notice.Component
      body="It runs at the next build. Workspaces keep the current build until then."
      icon="hammer"
      moklyInstance="script-changed"
      title={title}
      {...defined({
        action: props.readOnly ? undefined : (
          <actionButton.Component
            disabled={buildRuns(props.build)}
            icon="hammer"
            moklyInstance="build-computer"
            tone="primary"
          >
            Build computer
          </actionButton.Component>
        ),
      })}
    />
  )
}

/**
 * The cloud computer as the data of a Mokly part: each build without the
 * saved message of a failed build, because the data of a build holds only
 * its time, its result, and its length.
 */
export function computerData(computer: OrgComputer): OrgComputer {
  const { lastGood, ...rest } = computer
  return {
    ...rest,
    ...(lastGood ? { lastGood: buildOf(lastGood) } : {}),
    history: computer.history.map(buildOf),
  }
}

/** The builds of a computer, as the card of its builds takes them. */
function buildsOf(computer: OrgComputer): OrgBuilds {
  const { lastGood, history, logs } = computerData(computer)
  return { ...(lastGood ? { lastGood } : {}), history, logs }
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
      <tabIntro.Component moklyInstance="intro" title="Cloud computer">
        The shared cloud computer of {props.org}. Every workspace starts from
        it, with every repository of the org.
        {props.readOnly === 'member' ? ' Only an admin can change it.' : null}
      </tabIntro.Component>
      {props.repositoryNotice}
      <buildSection.Component
        builds={buildsOf(computer)}
        changeWaits={changed || repositoriesChanged}
        moklyInstance="builds"
        readOnly={readOnly}
        state={props.build}
      />
      <scriptSection.Component
        description={
          readOnly
            ? `${includedSoftware} The install script runs only at a build of the computer.`
            : `${includedSoftware} The install script runs only when you build the computer.`
        }
        moklyInstance="install-script"
        readOnly={readOnly}
        script={
          changed ? computer.changedInstallScript : computer.installScript
        }
        title="Install software"
        {...defined({
          notice: changed
            ? changedNotice({ build: props.build, builds: computer, readOnly })
            : undefined,
        })}
      />
      <scriptSection.Component
        description="Runs in the cloud computer of each workspace, at each start and resume."
        moklyInstance="startup-script"
        readOnly={readOnly}
        script={computer.startupScript}
        title="Startup script"
      />
      <envVarsSection.Component
        moklyInstance="env-vars"
        org={props.org}
        readOnly={readOnly}
        vars={computer.envVars}
        {...defined({ form: props.envForm })}
      />
    </>
  )
}
