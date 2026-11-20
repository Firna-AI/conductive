import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { Menu } from '../components/common/Menu'
import { Sheet } from '../components/common/Sheet'
import { ComputerTab } from '../components/settings/ComputerTab'
import { AddValueModal } from '../components/values/AddValueModal'
import { EditValueModal } from '../components/values/EditValueModal'
import { rowMenu, valueRights } from '../components/values/ValueRow'
import { tabTitle } from '../components/values/valuesCopy'
import { ValuesTab } from '../components/values/ValuesTab'
import { memberViewer, you } from '../fixtures/members'
import {
  acmeValues,
  editedSecret,
  editedVariable,
  emptyRows,
  pastedRows,
  retypedVariable,
  type OrgValue,
} from '../fixtures/orgValues'
import type { SecretsAccess } from '../components/secrets/secretRights'
import { newSecret } from '../fixtures/secrets'
import { acmeSettings, OrgSettingsScreen } from './OrgSettingsScreen'
import { settingsOrg } from './settingsOrgs'

/**
 * The states of the proposal that combines the env vars and the secrets of
 * Acme in one tab, Env & secrets (Cal's reviews of 20 November 2026). `add`
 * is the Add modal of one secret, and `add-env` the same modal after a
 * paste of four env vars. `edit` and `edit-env` are the Edit modal of a
 * secret and of an env var. `edit-type` is the Edit modal of
 * STRIPE_SECRET_KEY with its type changed to secret. `menu` is the open
 * menu of that env var. `computer` is the Cloud computer tab without the
 * env vars.
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
        'edit-type',
        'menu',
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
      return (
        <AddValueModal
          admin={admin}
          kind="secret"
          org={org}
          rows={[{ name: newSecret.name, value: newSecret.value }]}
          viewport={viewport}
        />
      )
    case 'add-env':
      return (
        <AddValueModal
          admin={admin}
          kind="env"
          org={org}
          rows={[...pastedRows, ...emptyRows]}
          viewport={viewport}
        />
      )
    case 'edit':
    case 'edit-env':
    case 'edit-type': {
      const renamed = state.view === 'edit' ? editedSecret : editedVariable
      const value =
        state.view === 'edit-type'
          ? valueNamed(retypedVariable)
          : valueNamed(renamed.from)
      const kind = state.view === 'edit-env' ? 'env' : 'secret'
      return (
        <EditValueModal
          admin={admin}
          kind={kind}
          newName={state.view === 'edit-type' ? value.name : renamed.to}
          org={org}
          value={value}
          viewer={access.person}
          viewport={viewport}
        />
      )
    }
    case 'menu': {
      if (viewport !== 'mobile') return undefined
      const value = valueNamed(retypedVariable)
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
    state.view === 'menu' && viewport !== 'mobile' ? retypedVariable : undefined
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
