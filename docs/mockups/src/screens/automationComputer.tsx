import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { Menu } from '../../../../src/ui/components/common/Menu'
import { Sheet } from '../../../../src/ui/components/common/Sheet'
import {
  ComputerPicker,
  computerMenu,
} from '../components/new-workspace/ComputerPicker'
import { computerChoiceWords as words } from '../components/own-computers/computerChoiceCopy'
import { ownComputers, removedComputer } from '../fixtures/ownComputers'
import { computerPaths } from '../paths'
import type { AutomationState } from './automationState'
import { computerOptions } from './computerOptions'

/**
 * The computer of the run workspaces of an automation, in an org with own
 * computers: the choice of its owner, its name in the facts of another
 * member, and an own computer that an admin removed, which turned the
 * automation off.
 */
export type AutomationComputer = {
  picker: ReactNode
  name: string
  removed?: string
}

/** The own computer of the runs, by its name, or none for the cloud. */
function ownName(state: AutomationState): string | undefined {
  switch (state.computer) {
    case 'none':
    case 'cloud':
      return undefined
    case 'own':
      return ownComputers['build-01'].name
    case 'removed':
      return removedComputer
  }
}

/** The computer of the runs, or none while the org has no own computer. */
export function automationComputer(
  state: AutomationState,
  viewport: Viewport,
): AutomationComputer | undefined {
  if (state.computer === 'none') return undefined
  const own = ownName(state)
  const open = state.computerMenu === 'open'
  const name = own ?? words.cloud
  return {
    picker: (
      <ComputerPicker
        expanded={open}
        menu={
          open && viewport === 'desktop'
            ? computerMenu(computerOptions(own))
            : undefined
        }
        name={name}
        own={own !== undefined}
        to={computerPaths.automation.menu}
      />
    ),
    name,
    ...(state.computer === 'removed' ? { removed: removedComputer } : {}),
  }
}

/** The open menu of the choice on a phone, as a sheet, or `null`. */
export function automationComputerSheet(state: AutomationState): ReactNode {
  if (state.computer === 'none' || state.computerMenu === 'closed') return null
  return (
    <Sheet title={words.control}>
      <Menu
        entries={computerMenu(computerOptions(ownName(state)))}
        label={words.control}
        placement="sheet"
      />
    </Sheet>
  )
}
