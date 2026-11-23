import { Plus } from 'lucide-react'
import {
  olderSecret,
  replacedSecrets,
  replicaUrl,
  type OrgSecret,
} from '../../fixtures/secrets'
import { paths } from '../../paths'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import { ScreenLink } from '../common/ScreenLink'
import {
  Section,
  SectionText,
} from '../../../../../src/ui/components/settings/Section'
import { AddSecretForm } from './SecretForms'
import { SecretRow, type RowLinks, type RowMode } from './SecretRow'
import { mayAddSecret, secretRights, type SecretsAccess } from './secretRights'
import {
  envVarsNote,
  secretsIntro,
  secretsWords,
} from '../../../../../src/ui/components/secrets/secretsCopy'
import styles from '../../../../../src/ui/components/secrets/SecretsTab.module.css'

/**
 * What the tab shows: the list, the value that an admin just revealed, the
 * Add secret form, that form after it refused a name, the field of a new
 * value in the row of a secret, or that field in the row of a secret with
 * an older name.
 */
export type SecretsView =
  'list' | 'revealed' | 'add' | 'add-refused' | 'replace' | 'replace-older'

/**
 * How a row shows its secret in a view of the tab. Jonas added the secret
 * with an older name, so only an admin opens its Replace form.
 */
function rowMode(
  secret: OrgSecret,
  view: SecretsView,
  access: SecretsAccess,
): RowMode {
  if (view === 'revealed' && secret.name === replicaUrl.name) return 'revealed'
  const admin = access.kind === 'admin'
  const replaced = replacedSecrets[admin ? 'admin' : 'member']
  if (view === 'replace' && secret.name === replaced) return 'replacing'
  const older = view === 'replace-older' && secret.name === olderSecret.name
  return older && admin ? 'replacing' : 'hidden'
}

/** The screens that the actions of the rows lead to, for each reader. */
function rowLinks(access: SecretsAccess): RowLinks {
  switch (access.kind) {
    case 'admin':
      return {
        reveal: paths.secretsReveal,
        replace: paths.secretsReplace,
        delete: paths.secretsDelete,
      }
    case 'member':
      return { replace: paths.secretsMemberReplace }
    case 'suspended':
      return {}
  }
}

/**
 * The Secrets tab of the org settings (secrets decisions 2, 3, and 6): the
 * secrets of the org with what each is for, who added it, and the record
 * of its last reveal. No row holds a value until an admin reveals one.
 * Every member adds secrets, and the rights of each row follow
 * `secretRights`. The notes say what the mark for all agents does, and
 * when to use the env vars of the Cloud computer tab instead.
 * `computerTo` is that tab.
 */
export function SecretsTab(props: {
  org: string
  secrets: readonly OrgSecret[]
  access: SecretsAccess
  view: SecretsView
  computerTo: string
}) {
  const { access } = props
  const adds = mayAddSecret(access)
  const view = adds ? props.view : 'list'
  const adding = view === 'add' || view === 'add-refused'
  const addTo =
    access.kind === 'admin' ? paths.secretsAdd : paths.secretsMemberAdd
  return (
    <Section
      actions={
        adds && !adding ? (
          <ScreenLink asChild to={addTo}>
            <ActionButton icon={Plus}>{secretsWords.add}</ActionButton>
          </ScreenLink>
        ) : undefined
      }
      description={secretsIntro}
      title={secretsWords.title}
    >
      {props.secrets.length === 0 ? (
        <SectionText muted>{secretsWords.none}</SectionText>
      ) : (
        <>
          <ul aria-label={secretsWords.title} className={styles.list}>
            {props.secrets.map((secret) => (
              <SecretRow
                key={secret.name}
                links={rowLinks(access)}
                mode={rowMode(secret, view, access)}
                rights={secretRights(secret, access)}
                secret={secret}
                viewer={access.person}
              />
            ))}
          </ul>
          <SectionText muted>
            {secretsWords.allAgentsNote}
            {access.kind === 'member' ? ` ${secretsWords.memberNote}` : null}
          </SectionText>
        </>
      )}
      <SectionText muted>
        {envVarsNote.before}
        <ScreenLink className={styles.link} to={props.computerTo}>
          {envVarsNote.link}
        </ScreenLink>
        {envVarsNote.after}
      </SectionText>
      {adding ? (
        <AddSecretForm
          mark={access.kind === 'admin'}
          org={props.org}
          refused={view === 'add-refused'}
        />
      ) : null}
    </Section>
  )
}
