import type { ReactNode } from 'react'
import { Gauge, Unplug } from 'lucide-react'
import { Menu } from '../../../../src/ui/components/common/Menu'
import { Notice } from '../../../../src/ui/components/common/Notice'
import { Sheet } from '../../../../src/ui/components/common/Sheet'
import {
  ComputerPicker,
  computerMenu,
  type ComputerOption,
} from '../components/new-workspace/ComputerPicker'
import { computerChoiceWords as words } from '../components/own-computers/computerChoiceCopy'
import {
  computerState,
  type OwnComputer,
} from '../components/own-computers/ownComputer'
import { ownComputers } from '../fixtures/ownComputers'
import { computerPaths } from '../paths'
import { computerOptions } from './computerOptions'
import type { NewWorkspaceFormState } from './newWorkspaceParts'

type Form = NewWorkspaceFormState

/** Where the choice sits: on the New workspace page, or in the dialog. */
type Surface = 'page' | 'dialog'

/** The own computer of the form, or none for the cloud computer. */
function formComputer(state: Form): OwnComputer | undefined {
  switch (state.computer) {
    case 'none':
    case 'cloud':
      return undefined
    case 'own':
      return ownComputers['build-01']
    case 'offline':
      return ownComputers['lab-server']
    case 'full':
      return ownComputers['build-02']
  }
}

/** The computers that the menu offers, with the one of the form checked. */
function optionsOf(state: Form): ComputerOption[] {
  return computerOptions(formComputer(state)?.name)
}

/** The screens of the open menu, on the page and in the dialog. */
const menuScreens: Readonly<Record<Surface, string>> = {
  page: computerPaths.newWorkspace.menu,
  dialog: computerPaths.newWorkspace.dialogMenu,
}

/**
 * The computer choice right of the branch control, or none while the org
 * has no own computer. On a computer the open menu hangs below it, and a
 * phone opens it as a sheet, from `computerSheet`.
 */
export function computerControl(props: {
  state: Form
  surface: Surface
  mobile: boolean
}): ReactNode {
  const { state, surface } = props
  if (state.computer === 'none') return undefined
  const picked = formComputer(state)
  const open = state.computerMenu === 'open'
  return (
    <ComputerPicker
      expanded={open}
      menu={open && !props.mobile ? computerMenu(optionsOf(state)) : undefined}
      name={picked?.name ?? words.cloud}
      own={picked !== undefined}
      to={menuScreens[surface]}
      tone={surface === 'dialog' ? 'plain' : undefined}
    />
  )
}

/** The open menu of a phone, as a sheet, or `null` while it is closed. */
export function computerSheet(state: Form): ReactNode {
  if (state.computer === 'none' || state.computerMenu === 'closed') return null
  return (
    <Sheet title={words.control}>
      <Menu
        entries={computerMenu(optionsOf(state))}
        label={words.control}
        placement="sheet"
      />
    </Sheet>
  )
}

/**
 * The notice of an own computer that the workspace waits for: one that is
 * offline, or one that runs as many workspaces as its limit. Send stays
 * on, and the start waits for the computer.
 */
export function computerNotice(state: Form): ReactNode {
  const computer = formComputer(state)
  if (computer === undefined) return null
  switch (computerState(computer)) {
    case 'offline':
      return (
        <Notice
          body={words.offlineBody}
          icon={Unplug}
          key="computer"
          title={words.offlineTitle(computer.name)}
        />
      )
    case 'full':
      return (
        <Notice
          body={words.fullBody(computer.running, computer.limit ?? 0)}
          icon={Gauge}
          key="computer"
          title={words.fullTitle(computer.name)}
        />
      )
    default:
      return null
  }
}

/** The note under the pickers for an own computer, with its newest build. */
export function computerNote(state: Form, org: string): string | undefined {
  const computer = formComputer(state)
  const built = computer?.builds.built
  if (computer === undefined || built === undefined) return undefined
  return words.note(computer.name, org, built)
}

/**
 * The screen that Send leads to on an own computer: the start of the new
 * workspace on build-01. The mockups draw no start of a new workspace on
 * an offline or a full computer, so Send there leads nowhere.
 */
export function computerSendTo(state: Form): string | undefined {
  return state.computer === 'own' ? computerPaths.workspace.starting : undefined
}
