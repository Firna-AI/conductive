import type { ReactNode } from 'react'
import { actionButton } from '../entries/components/common/actions.mockup'
import { buildRuns, type BuildState } from '../components/settings/BuildSection'
import type { RepositoryWait } from '../../../../src/ui/components/settings/repositoryChangeCopy'
import { repositoryNotice } from '../entries/components/settings/RepositoryNotice.mockup'
import { changedNames } from '../fixtures/repositories'
import type { OrgSettingsState } from './orgSettingsState'
import type { SettingsOrg } from './settingsOrgs'
import { defined } from '../defined'

/**
 * How the repository changes wait, from the builds of the org. The first
 * state that applies wins: a failed newest build while none runs, a build
 * that runs while an added repository waits, or else a wait for a build.
 */
function waitOf(build: BuildState, added: boolean): RepositoryWait {
  switch (build) {
    case 'failed':
    case 'time-limit':
    case 'ended':
      return 'failed'
    case 'building':
    case 'waiting':
      return added ? 'building' : 'waiting'
    case 'ready':
    case 'none':
      return 'waiting'
  }
}

/**
 * The action of an admin: Try again after a failed build, or Build
 * computer, which waits while a build runs. A build that runs for an added
 * repository needs no action.
 */
function adminAction(wait: RepositoryWait, build: BuildState): ReactNode {
  switch (wait) {
    case 'failed':
      return (
        <actionButton.Component
          icon="rotate-cw"
          moklyInstance="repository-retry-build"
          tone="primary"
        >
          Try again
        </actionButton.Component>
      )
    case 'waiting':
      return (
        <actionButton.Component
          disabled={buildRuns(build)}
          icon="hammer"
          moklyInstance="repository-build-computer"
          tone="primary"
        >
          Build computer
        </actionButton.Component>
      )
    case 'building':
      return undefined
  }
}

/**
 * The repository notice of the Repositories and Cloud computer tabs, or
 * `null` while the cloud computer of the org holds every saved change. Only
 * an admin of an org in use gets an action, and only on the Repositories
 * tab: on the Cloud computer tab, the build card under the notice has the
 * same action.
 */
export function settingsRepositoryNotice(
  state: OrgSettingsState,
  settings: SettingsOrg,
): ReactNode {
  if (state.org === 'new' || settings.computer.lastGood === undefined) {
    return null
  }
  const { added, removed } = changedNames(state.repositoryChange)
  if (added.length === 0 && removed.length === 0) return null
  const wait = waitOf(state.build, added.length > 0)
  const admin = state.viewer === 'admin'
  const editable =
    admin && state.org === 'active' && state.tab === 'repositories'
  return (
    <repositoryNotice.Component
      added={added}
      admin={admin}
      moklyInstance="repository-notice"
      removed={removed}
      wait={wait}
      {...defined({
        action: editable ? adminAction(wait, state.build) : undefined,
      })}
    />
  )
}
