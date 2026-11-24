import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { RemoveRepositoryText } from '../../../../../src/ui/components/settings/RemoveRepositoryText'
import {
  removedPlaceOf,
  repositoryRemoval,
} from '../../../../../src/ui/components/settings/repositoryRemovalCopy'
import { automationRows } from '../../fixtures/automationRows'
import { repositoryOf } from '../../fixtures/automations'
import type { ReachableRepository } from '../../fixtures/repositories'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { confirmDialog } from '../../entries/components/common/ConfirmDialog.mockup'
import { ScreenLink } from '../common/ScreenLink'

/**
 * The active automations of Acme in the repository `name`, as its
 * Automations page lists them.
 */
function activeAutomations(name: string): number {
  return automationRows.filter(
    (row) => row.automation.active && repositoryOf(row.automation) === name,
  ).length
}

/**
 * The question before Remove of the row menu of the chosen repository at
 * `place` of `chosen`, which lists the chosen repositories in the order.
 * It names the repository and what adding it again does not bring back:
 * New workspace no longer offers it, the repository that becomes the
 * default, and its active automations, which turn off until each owner
 * turns one on again. Remove saves at once and starts no build. Cancel
 * changes nothing.
 */
export function RemoveRepositoryDialog(props: {
  chosen: readonly ReachableRepository[]
  place: number
  viewport: Viewport
}) {
  const repository = props.chosen.at(props.place)
  if (!repository) return null
  const names = props.chosen.map((item) => item.name)
  return (
    <confirmDialog.Component
      actions={
        <>
          <ScreenLink asChild to={paths.repositories}>
            <actionButton.Component moklyInstance="dialog-cancel">
              {repositoryRemoval.cancel}
            </actionButton.Component>
          </ScreenLink>
          <actionButton.Component
            icon="x"
            moklyInstance="dialog-remove-repository"
            tone="danger"
          >
            {repositoryRemoval.confirm}
          </actionButton.Component>
        </>
      }
      moklyInstance="remove-repository-dialog"
      title={repositoryRemoval.title(repository.name)}
      viewport={props.viewport}
    >
      <RemoveRepositoryText
        automations={activeAutomations(repository.name)}
        place={removedPlaceOf(names, names.indexOf(repository.name))}
      />
    </confirmDialog.Component>
  )
}
