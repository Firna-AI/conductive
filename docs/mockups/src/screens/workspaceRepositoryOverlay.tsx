import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { FailureToast } from '../components/common/FailureToast'
import { Menu } from '../../../../src/ui/components/common/Menu'
import { Sheet } from '../../../../src/ui/components/common/Sheet'
import { RepositoryChangeDialog } from '../components/workspace/RepositoryChangeDialog'
import { repositoryMenuEntries } from '../components/workspace/RepositoryPicker'
import {
  repositoryFailure,
  repositoryMenu,
} from '../../../../src/ui/components/workspace/repositoryMoveCopy'
import { repositories } from '../fixtures/repositories'
import { movedRepository } from '../fixtures/repositoryMove'
import type { Workspace } from '../fixtures/workspaces'

/**
 * What a repository change lays over the workspace: the menu of the
 * repository, which a phone shows as a sheet and desktop below its button,
 * the question before the change, or the toast of a change that stopped.
 */
export function repositoryOverlay(
  overlay: 'repository' | 'repository-change' | 'repository-failed',
  workspace: Workspace,
  viewport: Viewport,
): ReactNode {
  const mobile = viewport === 'mobile'
  switch (overlay) {
    case 'repository':
      return mobile ? (
        <Sheet title={workspace.name}>
          <Menu
            entries={repositoryMenuEntries(workspace.repository)}
            label={repositoryMenu.label}
            placement="sheet"
          />
        </Sheet>
      ) : null
    case 'repository-change':
      return (
        <RepositoryChangeDialog
          from={workspace.repository}
          to={movedRepository}
          viewport={viewport}
        />
      )
    case 'repository-failed':
      return (
        <FailureToast
          message={repositoryFailure.clash(repositories[movedRepository].name)}
          phone={mobile}
          title={repositoryFailure.title}
        />
      )
  }
}
