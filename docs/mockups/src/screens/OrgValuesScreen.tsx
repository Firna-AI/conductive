import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ScreenLink } from '../components/common/ScreenLink'
import { SecretsTab } from '../components/secrets/SecretsTab'
import secrets from '../components/secrets/SecretsTab.module.css'
import { ComputerTab } from '../components/settings/ComputerTab'
import { EnvVarsSection } from '../components/settings/EnvVarsSection'
import { Section, SectionText } from '../components/settings/Section'
import { MoveValueDialog } from '../components/values/MoveValueDialog'
import { computerNote } from '../components/values/valuesCopy'
import { ValuesTab, type ValuesView } from '../components/values/ValuesTab'
import { memberViewer, you } from '../fixtures/members'
import { acmeValues } from '../fixtures/orgValues'
import { acmeSecrets } from '../fixtures/secrets'
import { paths } from '../paths'
import { acmeSettings, OrgSettingsScreen } from './OrgSettingsScreen'
import { settingsOrg } from './settingsOrgs'

/**
 * The states of the proposal that combines the env vars and the secrets of
 * Acme in the Secrets tab (items 1 B, 2 C, 3 B, and 4 B of 17 November 2026,
 * open). `move` is the list with the question before Move. `computer` is the
 * Cloud computer tab after the move of the env vars. `two-sections` is
 * option 1 A, for comparison: the two lists, one under the other.
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
        'add-start',
        'rename',
        'rename-start',
        'move',
        'computer',
        'two-sections',
      ],
    },
    viewer: { enum: ['admin', 'member'] },
  },
} as const

export type OrgValuesState = SchemaProps<typeof orgValuesSchema>

/** The list of Acme as Cal, an admin, sees it. */
export const acmeValuesState: OrgValuesState = { view: 'list', viewer: 'admin' }

/** The line of the Cloud computer tab where the env vars were. */
function ComputerNote() {
  return (
    <Section title={computerNote.title}>
      <SectionText muted>
        {computerNote.before}
        <ScreenLink className={secrets.link} to={paths.values}>
          {computerNote.link}
        </ScreenLink>
        {computerNote.after}
      </SectionText>
    </Section>
  )
}

/** The org settings of Acme in one state of the proposal. */
export function OrgValuesScreen(props: {
  state: OrgValuesState
  viewport: Viewport
}) {
  const { view, viewer } = props.state
  const computer = view === 'computer'
  const state = {
    ...acmeSettings,
    tab: computer ? ('computer' as const) : ('secrets' as const),
    viewer,
  }
  const settings = settingsOrg(state)
  const org = settings.org.name
  const person = viewer === 'admin' ? you : memberViewer
  const access = { kind: viewer, person }
  let body
  if (computer) {
    body = (
      <ComputerTab
        build="ready"
        computer={settings.computer}
        envVars={<ComputerNote />}
        org={org}
        readOnly={viewer === 'admin' ? undefined : 'member'}
        script="built"
      />
    )
  } else if (view === 'two-sections') {
    body = (
      <>
        <SecretsTab
          access={access}
          org={org}
          secrets={acmeSecrets}
          view="list"
        />
        <EnvVarsSection org={org} readOnly={viewer !== 'admin'} />
      </>
    )
  } else {
    const tabView: ValuesView = view === 'move' ? 'list' : view
    body = (
      <ValuesTab access={access} org={org} values={acmeValues} view={tabView} />
    )
  }
  return (
    <OrgSettingsScreen
      body={body}
      dialog={
        view === 'move' ? (
          <MoveValueDialog viewport={props.viewport} />
        ) : undefined
      }
      state={state}
      viewport={props.viewport}
    />
  )
}
