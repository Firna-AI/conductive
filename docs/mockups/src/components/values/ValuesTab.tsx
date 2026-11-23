import { Plus } from 'lucide-react'
import type { OrgValue } from '../../fixtures/orgValues'
import { valuesPaths } from '../../valuesPaths'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { mayAddSecret, type SecretsAccess } from '../secrets/secretRights'
import { Section } from '../../../../../src/ui/components/settings/Section'
import { ValueRow } from './ValueRow'
import { addWords, tabTitle, valuesIntro } from './valuesCopy'
import styles from './ValuesTab.module.css'

/**
 * The Env & secrets tab of the proposal (Cal's review of 20 November 2026):
 * the env vars and the secrets of the org in one list, sorted by name. Each
 * row shows its name, an Env or Secret badge, and the description of a
 * secret. The "⋯" menu of a row holds its actions, and Add and Edit open a
 * modal. `menuOpen` names the row whose menu shows under its button.
 */
export function ValuesTab(props: {
  values: readonly OrgValue[]
  access: SecretsAccess
  menuOpen?: string
}) {
  const { access } = props
  const addTo =
    access.kind === 'admin' ? valuesPaths.add : valuesPaths.memberAdd
  return (
    <Section
      actions={
        mayAddSecret(access) ? (
          <ScreenLink asChild to={addTo}>
            <ActionButton icon={Plus}>{addWords.button}</ActionButton>
          </ScreenLink>
        ) : undefined
      }
      description={valuesIntro}
      title={tabTitle}
    >
      <ul aria-label={tabTitle} className={styles.list}>
        {props.values.map((value) => (
          <ValueRow
            access={access}
            key={`${value.kind}:${value.name}`}
            menuOpen={props.menuOpen === value.name}
            value={value}
          />
        ))}
      </ul>
    </Section>
  )
}
