import { useState } from 'react'
import { useToast } from '@firna/ui/toast'
import { errorMessage } from '../../app/api/client'
import type { OrgModel } from '../../app/org-model'
import {
  createSection,
  deleteSection,
  moveSection,
  moveToSection,
  renameSection,
  setSectionCollapsed,
} from '../../app/section-actions'
import { defaultSection } from '../../app/sections'
import { valueOf } from '../../app/store'
import { useNewWorkspace } from '../new-workspace/NewWorkspaceHost'
import type { DropTarget } from './drop-target'
import type { SectionActions } from './SectionHeader'

/**
 * The actions of the workspace list. A change shows at once; when its write
 * fails, the list goes back, and a toast names what failed.
 */
export function useListActions(org: OrgModel) {
  const newWorkspace = useNewWorkspace()
  const { toast } = useToast()
  const [adding, setAdding] = useState(false)
  const failed = (title: string) => (error: unknown) =>
    toast({ title, description: errorMessage(error), tone: 'error' })

  const actions: SectionActions = {
    toggle: (section) =>
      void setSectionCollapsed(org, section.id, !section.collapsed).catch(
        failed("The section didn't change."),
      ),
    rename: (section, name) =>
      void renameSection(org, section.id, name).catch(
        failed("The section wasn't renamed."),
      ),
    moveTo: (section, index) =>
      void moveSection(org, section.id, index).catch(
        failed("The section didn't move."),
      ),
    // General, the default section, keeps the one draft of the row at the
    // top of the list, which puts the workspace in General too.
    newWorkspace: (section) =>
      newWorkspace.open({
        orgId: org.orgId,
        sectionId: section.isDefault ? null : section.id,
      }),
    newSection: () => setAdding(true),
    remove: (section) => {
      const general = defaultSection(
        (valueOf(org.sections.get()) ?? []).filter(
          (item) => item.id !== section.id,
        ),
      )
      deleteSection(org, section.id).then(
        () =>
          toast({
            title: `${section.name} is deleted.`,
            description: general
              ? `Its workspaces are in ${general.name}.`
              : undefined,
            tone: 'success',
          }),
        failed("The section wasn't deleted."),
      )
    },
  }

  const move = (workspaceId: string, target: DropTarget) =>
    void moveToSection(org, workspaceId, target.sectionId, target.index).catch(
      failed("The workspace didn't move."),
    )

  const create = (name: string) => {
    setAdding(false)
    void createSection(org, name).catch(failed("The section wasn't created."))
  }

  return { actions, move, adding, create, cancelAdding: () => setAdding(false) }
}
