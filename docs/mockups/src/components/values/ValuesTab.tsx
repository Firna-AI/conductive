import { Plus } from 'lucide-react'
import {
  renamedSecret,
  renamedVariable,
  type OrgValue,
} from '../../fixtures/orgValues'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { mayAddSecret, type SecretsAccess } from '../secrets/secretRights'
import { secretsWords } from '../secrets/secretsCopy'
import { Section, SectionText } from '../settings/Section'
import { AddValueForm } from './ValueForms'
import { ValueRow, type ValueLinks } from './ValueRow'
import { valuesIntro, valuesNotes } from './valuesCopy'
import styles from './ValuesTab.module.css'

/**
 * What the combined tab shows: the list, the Add secret form for each
 * kind, or the Rename form of a secret or of a value for each start.
 */
export type ValuesView =
  'list' | 'add' | 'add-start' | 'rename' | 'rename-start'

/** Whether the row of `value` shows its Rename form in `view`. */
function renaming(value: OrgValue, view: ValuesView): boolean {
  if (view === 'rename') return value.name === renamedSecret.from
  if (view === 'rename-start') return value.name === renamedVariable.from
  return false
}

/** The screens that the actions of the rows lead to, for each reader. */
function rowLinks(value: OrgValue, access: SecretsAccess): ValueLinks {
  if (access.kind !== 'admin') return {}
  return {
    rename:
      value.kind === 'start' ? paths.valuesRenameStart : paths.valuesRename,
    move: paths.valuesMove,
  }
}

/**
 * The Secrets tab of the proposal (items 1 B, 2 C, 3 B, and 4 B, open): the
 * env vars and the secrets of the org in one list, sorted by name. Each row
 * shows its kind, Each start or After approval, and keeps the rights and the
 * marks of that kind. One Add secret form asks an admin for the kind. The
 * Cloud computer tab no longer lists the env vars.
 */
export function ValuesTab(props: {
  org: string
  values: readonly OrgValue[]
  access: SecretsAccess
  view: ValuesView
}) {
  const { access } = props
  const adds = mayAddSecret(access)
  const admin = access.kind === 'admin'
  const view = adds ? props.view : 'list'
  const adding = view === 'add' || view === 'add-start'
  const addTo = admin ? paths.valuesAdd : paths.valuesMemberAdd
  return (
    <Section
      actions={
        adds && !adding ? (
          <ScreenLink asChild to={addTo}>
            <ActionButton icon={Plus}>{secretsWords.add}</ActionButton>
          </ScreenLink>
        ) : undefined
      }
      description={valuesIntro(props.org)}
      title={secretsWords.title}
    >
      <ul aria-label={secretsWords.title} className={styles.list}>
        {props.values.map((value) => (
          <ValueRow
            access={access}
            key={`${value.kind}:${value.name}`}
            links={rowLinks(value, access)}
            renaming={renaming(value, view)}
            value={value}
          />
        ))}
      </ul>
      <SectionText muted>
        {secretsWords.allAgentsNote} {valuesNotes.start}
        {access.kind === 'member' ? ` ${valuesNotes.member}` : null}
      </SectionText>
      {adding ? (
        <AddValueForm
          admin={admin}
          kind={view === 'add-start' ? 'start' : 'approval'}
          org={props.org}
        />
      ) : null}
    </Section>
  )
}
