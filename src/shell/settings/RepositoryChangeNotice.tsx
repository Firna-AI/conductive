import type { ReactNode } from 'react'
import { RepositoryNotice } from '../../../docs/mockups/src/components/settings/RepositoryNotice'
import type { RepositoryWait } from '../../../docs/mockups/src/components/settings/repositoryChangeCopy'
import { latestBuild } from '../../app/org-model'
import { repositoryChangesOf } from '../../app/repository-changes'
import type { BuildsResponse } from '../../shared/org-settings'
import type { Action } from '../ui/useAction'
import { BuildButton, TryAgainButton } from './BuildParts'

/**
 * The action of the notice: Try again after a failed build, or Build
 * computer, which waits while a build runs. A build that runs for an added
 * repository needs no action.
 */
function noticeAction(
  wait: RepositoryWait,
  build: Action<[]>,
  running: boolean,
): ReactNode {
  switch (wait) {
    case 'failed':
      return <TryAgainButton action={build} />
    case 'waiting':
      return <BuildButton action={build} running={running} tone="primary" />
    case 'building':
      return undefined
  }
}

/**
 * The repository notice of an admin, from the builds of the org, as
 * `RepositoryNotice` of the mockups draws it. It shows nothing while the
 * builds load, or while the org image holds every saved change of the
 * repositories. `build` gives it its action, on the Repositories tab only:
 * on the Cloud computer tab the build card under the notice has the same
 * action, so the notice there has none.
 */
export function AdminRepositoryNotice(props: {
  builds: BuildsResponse | undefined
  build?: Action<[]>
}) {
  const { builds, build } = props
  const changes = builds ? repositoryChangesOf(builds) : null
  if (!builds || !changes) return null
  const running = latestBuild(builds)?.state === 'running'
  return (
    <RepositoryNotice
      action={build ? noticeAction(changes.wait, build, running) : undefined}
      added={changes.added}
      admin
      removed={changes.removed}
      wait={changes.wait}
    />
  )
}
