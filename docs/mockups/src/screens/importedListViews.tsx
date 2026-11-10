import type { Viewport } from '@mokly/mokly'
import { ImportedArchiveDialog } from '../components/conductor-import/ImportedArchiveDialog'
import { acmeRail } from '../components/layout/OrgRail'
import { ArchivedToast } from '../components/workspace/ArchivedToast'
import {
  archivedWithImport,
  sectionsWithImport,
} from '../components/workspaces/importSections'
import type { ArchivedList } from '../components/workspaces/sections'
import {
  activatedCouponTotals,
  couponTotals,
  importedWorkspaces,
} from '../fixtures/importedWorkspaces'
import { viewerMembership } from '../fixtures/members'
import { paths } from '../paths'
import type { MenuListView } from './workspaceMenuView'

/**
 * The lists of Acme after an import from Conductor: the list just after
 * the import, the question of Archive over it, the list just after that
 * Archive, and the open Archived group with the activated workspace after
 * its Archive.
 */
export const importLists = [
  'imported',
  'imported-archive',
  'imported-archived',
  'imported-activated-archived',
] as const

export type ImportList = (typeof importLists)[number]

/** Whether a list of the list screen is a list after an import. */
export function isImportList(list: string): list is ImportList {
  return importLists.some((item) => item === list)
}

/** Cal, an admin of Acme, who imported the workspaces. */
const viewer = viewerMembership('admin')

/**
 * The list after an Archive took the drawn workspace to the open Archived
 * group, where its row opens the archived workspace. No workspace is open,
 * so no row is selected.
 */
function afterArchive(
  list: ArchivedList,
): Pick<MenuListView, 'sections' | 'archived'> {
  return {
    sections: list.sections,
    archived: list.archived.map((row) => ({ ...row, selected: false })),
  }
}

/**
 * The list and what lies over it, for a list after an import. Archive of
 * the drawn workspace in the list asks the question over the list, as the
 * workspace does before its activation. After that Archive, the toast
 * offers no Restore, because the workspace has no kept cloud computer.
 * The activated workspace in the Archived group offers Restore under the
 * pointer while the app keeps its cloud computer, and Restore puts it back
 * in its section, stopped. A phone has no pointer, so its rows show their
 * times.
 */
export function importListView(
  list: ImportList,
  viewport: Viewport,
): MenuListView {
  const base = { viewer, rail: acmeRail }
  const sections = sectionsWithImport(
    importedWorkspaces,
    undefined,
    undefined,
    { archiveTo: paths.importedListArchive },
  )
  switch (list) {
    case 'imported':
      return { ...base, sections, over: null }
    case 'imported-archive':
      return {
        ...base,
        sections,
        over: (
          <ImportedArchiveDialog
            archiveTo={paths.importedListArchived}
            cancelTo={paths.importedList}
            viewport={viewport}
            workspace={couponTotals}
          />
        ),
      }
    case 'imported-archived': {
      const archived = archivedWithImport(
        couponTotals,
        importedWorkspaces,
        paths.importedArchived,
      )
      return {
        ...base,
        ...afterArchive(archived),
        over: (
          <ArchivedToast
            name={couponTotals.name}
            phone={viewport === 'mobile'}
            restorable={false}
          />
        ),
      }
    }
    case 'imported-activated-archived': {
      const archived = archivedWithImport(
        activatedCouponTotals,
        importedWorkspaces,
        paths.importedActivatedArchived,
        { open: true, to: paths.importedStopped },
      )
      return {
        ...base,
        ...afterArchive(archived),
        focus: { workspace: couponTotals.key, drawing: { kind: 'hover' } },
        over: null,
      }
    }
  }
}
