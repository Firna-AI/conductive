import type { ReactNode } from 'react'
import { Hammer, RotateCw } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import type { BuildState } from '../components/settings/BuildSection'
import type { JobKind } from '../components/settings/buildCopy'
import type { RepositoryWait } from '../components/settings/repositoryChangeCopy'
import { RepositoryNotice } from '../components/settings/RepositoryNotice'
import { changedNames } from '../fixtures/repositories'
import type { OrgSettingsState } from './OrgSettingsScreen'
import type { SettingsOrg } from './settingsOrgs'

/**
 * How the repository changes wait, from the newest job of the org. The
 * first state that applies wins: a failed newest build while none runs, a
 * build that runs while an added repository waits, or else a wait for a
 * build. A refresh holds the repositories of the newest good build, so a
 * refresh that runs, failed, or succeeded never counts as a build: the
 * changes wait for a build that succeeds after a failed newest build, or
 * else for the next build.
 */
function waitOf(
  build: BuildState,
  added: boolean,
  job: JobKind,
  newestBuild: OrgSettingsState['newestBuild'],
): RepositoryWait {
  if (job !== 'build') return newestBuild === 'failed' ? 'failed' : 'waiting'
  switch (build) {
    case 'failed':
    case 'time-limit':
      return 'failed'
    case 'building':
      return added ? 'building' : 'waiting'
    case 'ready':
    case 'none':
      return 'waiting'
  }
}

/**
 * The action of an admin: Try again after a failed build, or Build
 * computer. Each waits while a job runs, such as a refresh after a failed
 * build, because one job runs at a time. A build that runs for an added
 * repository needs no action.
 */
function adminAction(wait: RepositoryWait, build: BuildState): ReactNode {
  switch (wait) {
    case 'failed':
      return (
        <ActionButton
          disabled={build === 'building'}
          icon={RotateCw}
          tone="primary"
        >
          Try again
        </ActionButton>
      )
    case 'waiting':
      return (
        <ActionButton
          disabled={build === 'building'}
          icon={Hammer}
          tone="primary"
        >
          Build computer
        </ActionButton>
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
  const wait = waitOf(
    state.build,
    added.length > 0,
    state.job,
    state.newestBuild,
  )
  const admin = state.viewer === 'admin'
  const editable =
    admin && state.org === 'active' && state.tab === 'repositories'
  return (
    <RepositoryNotice
      action={editable ? adminAction(wait, state.build) : undefined}
      added={added}
      admin={admin}
      removed={removed}
      wait={wait}
    />
  )
}
