import { useEffect, useState } from 'react'
import { ArchiveModel } from '../../app/archive-model'
import type { OrgModel } from '../../app/org-model'
import { mayArchive } from '../../app/permissions'
import { useStore } from '../../app/store'
import type { Workspace } from '../../shared/workspaces'
import { useApp } from '../context'
import { ArchiveDialog } from '../workspace/ArchiveDialog'

/** The list opens the Archive question without opening the workspace. */
export function useListArchive(org: OrgModel, readOnly: boolean) {
  const app = useApp()
  const boot = useStore(app.boot)
  const summary = useStore(app.orgs).find((item) => item.id === org.orgId)
  const suspended = useStore(org.suspension.suspended)
  const [target, setTarget] = useState<{
    workspace: Workspace
    archive: ArchiveModel
  } | null>(null)

  useEffect(() => () => target?.archive.cancel(), [target, org])

  const actionFor = (workspace: Workspace): (() => void) | undefined => {
    if (boot.state !== 'ready' || !summary || readOnly) return undefined
    if (!mayArchive({ role: summary.role, suspended }, workspace, boot.user)) {
      return undefined
    }
    return () => {
      const archive = new ArchiveModel(org, workspace.id, (detail) => {
        org.putWorkspace(detail.workspace)
      })
      setTarget({ workspace, archive })
      void archive.start()
    }
  }

  return {
    actionFor,
    dialog: target ? (
      <ArchiveDialog archive={target.archive} workspace={target.workspace} />
    ) : null,
  }
}
