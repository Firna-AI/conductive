import { DialogText } from '../common/ConfirmDialog'
import { removalText, type RemovedPlace } from './repositoryRemovalCopy'

/**
 * The text of the question before Remove of the row menu of a chosen
 * repository: New workspace no longer offers it, the repository that
 * becomes the default, or that none is left, and its active automations
 * that turn off, as `removalText` says. `automations` is `null` while
 * their number is not known. It takes no fixtures, so the app uses it too.
 */
export function RemoveRepositoryText(props: {
  place: RemovedPlace
  automations: number | null
}) {
  return <DialogText>{removalText(props.place, props.automations)}</DialogText>
}
