import type { ComputerOption } from '../components/new-workspace/ComputerPicker'
import {
  computerChoiceWords as words,
  menuDetail,
} from '../components/own-computers/computerChoiceCopy'
import {
  canStartOn,
  computerState,
} from '../components/own-computers/ownComputer'
import { acmeComputers } from '../fixtures/ownComputers'

/**
 * The computers that the choice of New workspace and of the automation
 * form offers: the cloud computer, then each own computer of Acme. One
 * without a good build stays off, with the note of when it is ready.
 * `picked` names the own computer of the form, or none for the cloud. A
 * computer that an admin removed is no longer in the menu, so no row of
 * the menu checks it.
 */
export function computerOptions(picked?: string): ComputerOption[] {
  const own = acmeComputers('list').map((computer) => ({
    name: computer.name,
    own: true,
    detail: menuDetail(
      computerState(computer),
      computer.running,
      computer.limit ?? 0,
    ),
    checked: computer.name === picked,
    disabled: !canStartOn(computer),
  }))
  const cloud = {
    name: words.cloud,
    own: false,
    detail: words.cloudDetail,
    checked: picked === undefined,
    disabled: false,
  }
  return [cloud, ...own]
}
