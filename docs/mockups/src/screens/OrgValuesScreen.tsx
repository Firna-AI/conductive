import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { Menu } from '../components/common/Menu'
import { Sheet } from '../components/common/Sheet'
import { ComputerTab } from '../components/settings/ComputerTab'
import { MoveValueDialog } from '../components/values/MoveValueDialog'
import { AddValueModal, EditValueModal } from '../components/values/ValueModals'
import { rowMenu, valueRights } from '../components/values/ValueRow'
import { tabTitle } from '../components/values/valuesCopy'
import { ValuesTab } from '../components/values/ValuesTab'
import { memberViewer, you } from '../fixtures/members'
import {
  acmeValues,
  editedSecret,
  editedVariable,
  movedVariable,
  type OrgValue,
} from '../fixtures/orgValues'
import type { SecretsAccess } from '../components/secrets/secretRights'
import { acmeSettings, OrgSettingsScreen } from './OrgSettingsScreen'
import { settingsOrg } from './settingsOrgs'

/**
 * The states of the proposal that combines the env vars and the secrets of
 * Acme in one tab, Env & secrets (Cal's review of 20 November 2026). `add`
 * and `add-env` are the Add modal for each type. `edit` and `edit-env` are
 * the Edit modal of a secret and of an env var. `menu` is the open menu of
 * STRIPE_SECRET_KEY, and `move` the question before its move to secrets.
 * `computer` is the Cloud computer tab without the env vars.
 */
export const orgValuesSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['view', 'viewer'],
  properties: {
    view: {
      enum: [
        'list',
        'add',
        'add-env',
        'edit',
        'edit-env',
        'menu',
        'move',
        'computer',
      ],
    },
    viewer: { enum: ['admin', 'member'] },
  },
} as const

export type OrgValuesState = SchemaProps<typeof orgValuesSchema>

/** The list of Acme as Cal, an admin, sees it. */
export const acmeValuesState: OrgValuesState = { view: 'list', viewer: 'admin' }

/** The value of Acme with this name. */
function valueNamed(name: string): OrgValue {
  const value = acmeValues.find((item) => item.name === name)
  if (!value) throw new Error(`Acme has no value ${name}`)
  return value
}

/** The modal, the dialog, or the phone sheet over the tab, in each state. */
function overlay(
  state: OrgValuesState,
  access: SecretsAccess,
  org: string,
  viewport: Viewport,
): ReactNode {
  const admin = access.kind === 'admin'
  switch (state.view) {
    case 'add':
    case 'add-env': {
      const kind = state.view === 'add-env' ? 'env' : 'secret'
      return (
        <AddValueModal
          admin={admin}
          kind={kind}
          org={org}
          viewport={viewport}
        />
      )
    }
    case 'edit':
    case 'edit-env': {
      const edited = state.view === 'edit' ? editedSecret : editedVariable
      return (
        <EditValueModal
          admin={admin}
          newName={edited.to}
          org={org}
          value={valueNamed(edited.from)}
          viewer={access.person}
          viewport={viewport}
        />
      )
    }
    case 'menu': {
      if (viewport !== 'mobile') return undefined
      const value = valueNamed(movedVariable)
      return (
        <Sheet title={value.name}>
          <Menu
            entries={rowMenu(valueRights(value, access))}
            label={value.name}
            placement="sheet"
          />
        </Sheet>
      )
    }
    case 'move':
      return <MoveValueDialog viewport={viewport} />
    default:
      return undefined
  }
}

/** The org settings of Acme in one state of the proposal. */
export function OrgValuesScreen(props: {
  state: OrgValuesState
  viewport: Viewport
}) {
  const { state, viewport } = props
  const computer = state.view === 'computer'
  const settingsState = {
    ...acmeSettings,
    tab: computer ? ('computer' as const) : ('secrets' as const),
    viewer: state.viewer,
  }
  const settings = settingsOrg(settingsState)
  const org = settings.org.name
  const person = state.viewer === 'admin' ? you : memberViewer
  const access: SecretsAccess = { kind: state.viewer, person }
  const menuOpen =
    state.view === 'menu' && viewport !== 'mobile' ? movedVariable : undefined
  const body = computer ? (
    <ComputerTab
      build="ready"
      computer={settings.computer}
      org={org}
      readOnly={state.viewer === 'admin' ? undefined : 'member'}
      script="built"
      withoutEnvVars
    />
  ) : (
    <ValuesTab access={access} menuOpen={menuOpen} values={acmeValues} />
  )
  return (
    <OrgSettingsScreen
      body={body}
      dialog={overlay(state, access, org, viewport)}
      secretsLabel={tabTitle}
      state={settingsState}
      viewport={viewport}
    />
  )
}
